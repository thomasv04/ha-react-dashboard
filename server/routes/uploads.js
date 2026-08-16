import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const DOMPurify = createDOMPurify(new JSDOM('').window);

/**
 * Extension de sortie **imposée** par type déclaré.
 *
 * L'extension venait de `originalname`, contrôlé par le client, et le filtre ne
 * regardait que `file.mimetype` — c'est-à-dire le `Content-Type` de la partie
 * multipart, tout aussi contrôlé par le client. Envoyer `Content-Type: image/png`
 * avec `filename="x.html"` écrivait donc `<uuid>.html` dans un dossier servi par
 * `express.static` : XSS stockée sur l'origine du dashboard. Idem en `.svg`.
 * Le nom de fichier ne doit plus rien emprunter à la requête.
 */
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const ALLOWED_ICON_MIME_TYPES = new Set(['image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ICON_SIZE = 2 * 1024 * 1024; // 2 MB (pre-resize)
const ICON_MAX_DIM = 128; // max width/height after resize

/**
 * Volume total autorisé pour les fichiers téléversés.
 *
 * Sans plafond, remplacer dix fois un fond d'écran laissait dix fichiers de
 * 10 Mo dans `/data` — que chaque sauvegarde Home Assistant emportait ensuite.
 * 200 Mo laissent largement de quoi faire tourner un diaporama tout en gardant
 * les sauvegardes d'une taille raisonnable.
 */
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

/**
 * Délai de grâce avant qu'un fichier non référencé soit considéré orphelin.
 *
 * Un fond d'écran est téléversé *avant* d'être enregistré dans la
 * configuration. Sans ce délai, un redémarrage survenu entre les deux
 * supprimerait l'image que l'utilisateur vient de choisir.
 */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Supprime les fichiers que plus aucune configuration ne référence.
 *
 * Remplacer dix fois un fond d'écran laissait dix fichiers de 10 Mo derrière
 * lui : le quota finissait par bloquer un envoi légitime, et chaque sauvegarde
 * Home Assistant emportait le tout.
 *
 * La détection est une simple recherche du nom de fichier dans la
 * configuration sérialisée. Les noms sont des UUID : aucun faux positif
 * possible, et c'est bien plus robuste que de parcourir une arborescence de
 * widgets dont la forme change à chaque version.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} uploadsDir
 * @returns {number} nombre de fichiers supprimés
 */
export function pruneOrphanUploads(db, uploadsDir) {
  const row = db.prepare('SELECT data FROM dashboard_config WHERE id = 1').get();
  // Pas de configuration = installation neuve. Tout supprimer serait le pire
  // moment pour se tromper.
  if (!row?.data) return 0;

  // L'historique compte : une image encore citée par un état archivé doit
  // survivre, sinon la restauration rendrait un dashboard aux cadres vides.
  const haystack = [
    row.data,
    ...db
      .prepare('SELECT data FROM config_history')
      .all()
      .map(h => h.data),
  ].join('');
  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  let removed = 0;

  for (const [table, subdir] of [
    ['uploaded_images', ''],
    ['uploaded_icons', 'icons'],
  ]) {
    for (const file of db.prepare(`SELECT filename, created_at FROM ${table}`).all()) {
      if (haystack.includes(file.filename)) continue;
      if (Date.parse(`${file.created_at.replace(' ', 'T')}Z`) > cutoff) continue;

      fs.rmSync(path.join(uploadsDir, subdir, file.filename), { force: true });
      db.prepare(`DELETE FROM ${table} WHERE filename = ?`).run(file.filename);
      removed += 1;
    }
  }

  if (removed > 0) console.info(`[uploads] Pruned ${removed} orphaned file(s)`);
  return removed;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} uploadsDir  Chemin absolu vers le dossier de stockage
 */
export function uploadsRouter(db, uploadsDir) {
  const router = express.Router();

  // S'assurer que le dossier existe
  fs.mkdirSync(uploadsDir, { recursive: true });

  /** Volume déjà occupé, images et icônes confondues. */
  const usedBytes = () =>
    (db.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM uploaded_images').get().total ?? 0) +
    (db.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM uploaded_icons').get().total ?? 0);

  /**
   * Refuse et supprime le fichier tout juste écrit si le quota est dépassé.
   *
   * Le contrôle a lieu **après** l'écriture : multer écrit au fil de l'eau, et
   * la taille réelle n'est connue qu'à la fin. Un dépassement ponctuel d'un
   * fichier est sans conséquence, il repart aussitôt.
   */
  const enforceQuota = (file, res) => {
    if (usedBytes() + file.size <= MAX_TOTAL_BYTES) return false;
    fs.unlinkSync(path.join(file.destination, file.filename));
    res.status(507).json({
      error: 'Storage quota exceeded.',
      message: `Delete existing images first — the ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB limit is reached.`,
    });
    return true;
  };

  // ── multer storage ─────────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${MIME_TO_EXT[file.mimetype] ?? '.bin'}`),
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type. Use JPEG, PNG, WebP, GIF or AVIF.'));
      }
    },
  });

  // ── POST /api/uploads/background ─────────────────────────────────────────
  router.post('/background', upload.single('image'), (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file received.' });
    }
    if (enforceQuota(file, res)) return;

    db.prepare(
      `
      INSERT INTO uploaded_images (filename, original_name, mime_type, size)
      VALUES (?, ?, ?, ?)
    `
    ).run(file.filename, file.originalname, file.mimetype, file.size);

    return res.status(201).json({ url: `/uploads/${file.filename}` });
  });

  // ── DELETE /api/uploads/background/:filename ──────────────────────────────
  router.delete('/background/:filename', (req, res) => {
    const { filename } = req.params;

    // Reject filenames containing path separators
    if (filename !== path.basename(filename)) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

    const row = db.prepare('SELECT filename FROM uploaded_images WHERE filename = ?').get(filename);
    if (!row) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM uploaded_images WHERE filename = ?').run(filename);

    return res.json({ ok: true });
  });

  // ── Icons upload storage ──────────────────────────────────────────────────
  const iconsDir = path.join(uploadsDir, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  const iconStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, iconsDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${MIME_TO_EXT[file.mimetype] ?? '.bin'}`),
  });

  const iconUpload = multer({
    storage: iconStorage,
    limits: { fileSize: MAX_ICON_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_ICON_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported type. Use PNG, WebP or SVG.'));
      }
    },
  });

  // ── GET /api/uploads/icons ────────────────────────────────────────────────
  router.get('/icons', (_req, res) => {
    const rows = db.prepare('SELECT filename, original_name, mime_type FROM uploaded_icons ORDER BY created_at DESC').all();
    return res.json(
      rows.map(r => ({ filename: r.filename, originalName: r.original_name, mimeType: r.mime_type, url: `/uploads/icons/${r.filename}` }))
    );
  });

  // ── POST /api/uploads/icons ───────────────────────────────────────────────
  router.post('/icons', iconUpload.single('icon'), async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file received.' });
    }
    if (enforceQuota(file, res)) return;

    const filePath = path.join(iconsDir, file.filename);

    // Sanitize SVG uploads to prevent XSS (strip <script>, event handlers, etc.)
    if (file.mimetype === 'image/svg+xml') {
      try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } });
        await fs.promises.writeFile(filePath, clean);
      } catch (sanitizeErr) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Invalid SVG file.' });
      }
    }

    // Auto-resize raster images (PNG/WebP) to max 128×128, skip SVGs
    if (file.mimetype !== 'image/svg+xml') {
      try {
        const meta = await sharp(filePath).metadata();
        if (meta.width > ICON_MAX_DIM || meta.height > ICON_MAX_DIM) {
          const resized = await sharp(filePath).resize(ICON_MAX_DIM, ICON_MAX_DIM, { fit: 'inside', withoutEnlargement: true }).toBuffer();
          await fs.promises.writeFile(filePath, resized);
        }
      } catch (sharpErr) {
        // If resize fails, delete the uploaded file and return error
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Failed to process image.' });
      }
    }

    const finalSize = fs.statSync(filePath).size;

    db.prepare(`INSERT INTO uploaded_icons (filename, original_name, mime_type, size) VALUES (?, ?, ?, ?)`).run(
      file.filename,
      file.originalname,
      file.mimetype,
      finalSize
    );

    return res.status(201).json({ url: `/uploads/icons/${file.filename}`, filename: file.filename, originalName: file.originalname });
  });

  // ── DELETE /api/uploads/icons/:filename ───────────────────────────────────
  router.delete('/icons/:filename', (req, res) => {
    const { filename } = req.params;

    if (filename !== path.basename(filename)) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

    const row = db.prepare('SELECT filename FROM uploaded_icons WHERE filename = ?').get(filename);
    if (!row) {
      return res.status(404).json({ error: 'Icon not found.' });
    }

    const filePath = path.join(iconsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM uploaded_icons WHERE filename = ?').run(filename);

    return res.json({ ok: true });
  });

  // ── Error handler (multer errors) ─────────────────────────────────────────
  router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large.' });
    }
    return res.status(400).json({ error: err.message ?? 'Upload failed.' });
  });

  return router;
}

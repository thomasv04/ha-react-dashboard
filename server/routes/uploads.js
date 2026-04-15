import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const ALLOWED_ICON_MIME_TYPES = new Set(['image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ICON_SIZE = 2 * 1024 * 1024; // 2 MB (pre-resize)
const ICON_MAX_DIM = 128; // max width/height after resize

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} uploadsDir  Chemin absolu vers le dossier de stockage
 */
export function uploadsRouter(db, uploadsDir) {
  const router = express.Router();

  // S'assurer que le dossier existe
  fs.mkdirSync(uploadsDir, { recursive: true });

  // ── multer storage ─────────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Type de fichier non supporté. Utilisez JPEG, PNG, WebP, GIF ou AVIF.'));
      }
    },
  });

  // ── POST /api/uploads/background ─────────────────────────────────────────
  router.post('/background', upload.single('image'), (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

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

    // Sécurité : rejeter les noms contenant des séparateurs de chemin
    if (filename !== path.basename(filename)) {
      return res.status(400).json({ error: 'Nom de fichier invalide.' });
    }

    const row = db.prepare('SELECT filename FROM uploaded_images WHERE filename = ?').get(filename);
    if (!row) {
      return res.status(404).json({ error: 'Image introuvable.' });
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
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  const iconUpload = multer({
    storage: iconStorage,
    limits: { fileSize: MAX_ICON_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_ICON_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Type non supporté. Utilisez PNG, WebP ou SVG.'));
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
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const filePath = path.join(iconsDir, file.filename);

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
        return res.status(400).json({ error: "Impossible de traiter l'image." });
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
      return res.status(400).json({ error: 'Nom de fichier invalide.' });
    }

    const row = db.prepare('SELECT filename FROM uploaded_icons WHERE filename = ?').get(filename);
    if (!row) {
      return res.status(404).json({ error: 'Icône introuvable.' });
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
      return res.status(413).json({ error: 'Fichier trop volumineux.' });
    }
    return res.status(400).json({ error: err.message ?? "Erreur lors de l'upload." });
  });

  return router;
}

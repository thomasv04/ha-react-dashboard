import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    db.prepare(`
      INSERT INTO uploaded_images (filename, original_name, mime_type, size)
      VALUES (?, ?, ?, ?)
    `).run(file.filename, file.originalname, file.mimetype, file.size);

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

  // ── Error handler (multer errors) ─────────────────────────────────────────
  router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Fichier trop volumineux (max 10 Mo).' });
    }
    return res.status(400).json({ error: err.message ?? 'Erreur lors de l\'upload.' });
  });

  return router;
}

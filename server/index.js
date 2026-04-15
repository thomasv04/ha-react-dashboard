import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.development', override: true });

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { initDB } from './db.js';
import { configRouter } from './routes/config.js';
import { profilesRouter } from './routes/profiles.js';
import { settingsRouter } from './routes/settings.js';
import { uploadsRouter } from './routes/uploads.js';
import { haAuthMiddleware } from './haAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8099;
const isProduction = process.env.NODE_ENV === 'production';

// ── Middlewares ────────────────────────────────────────────────────────────────

// Security headers (XSS, clickjacking, MIME-sniffing, etc.)
app.use(helmet({
  // CSP disabled for now — the SPA needs inline scripts/styles from Vite
  // Enable and tune once assets are stable
  contentSecurityPolicy: false,
}));

// Body parsing with tight per-route limits (set below per router)
// Global fallback kept small — only /api/config gets 2 MB
app.use(express.json({ limit: '50kb' }));

// Rate limiting par IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 300,              // 300 requêtes par minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// HA auth middleware (optionnel, activé en mode add-on)
if (process.env.HA_AUTH === 'true') {
  app.use('/api/', haAuthMiddleware);
}

// ── Database ──────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dashboard.db');
export const db = initDB(DB_PATH);

// ── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'data', 'uploads');

// ── API Routes ────────────────────────────────────────────────────────────────
// /api/config can be large (full dashboard layout)
app.use('/api/config', express.json({ limit: '2mb' }), configRouter(db));
app.use('/api/profiles', profilesRouter(db));
app.use('/api/settings', settingsRouter(db));
app.use('/api/uploads', uploadsRouter(db, UPLOADS_DIR));

// ── Serve uploaded images ─────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', etag: true }));

// ── Static files (SPA) ───────────────────────────────────────────────────────
if (isProduction) {
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
/* c8 ignore next */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[ha-dashboard] Server running on port ${PORT}`);
    console.log(`[ha-dashboard] DB path: ${DB_PATH}`);
  });
}

export default app;

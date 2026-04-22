import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.development', override: true });

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { initDB } from './db.js';
import { configRouter } from './routes/config.js';
import { profilesRouter } from './routes/profiles.js';
import { settingsRouter } from './routes/settings.js';
import { uploadsRouter } from './routes/uploads.js';
import { translationsRouter } from './routes/translations.js';
import { haAuthMiddleware } from './haAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8099;
const isProduction = process.env.NODE_ENV === 'production';

// ── Middlewares ────────────────────────────────────────────────────────────────

// Security headers (XSS, clickjacking, MIME-sniffing, etc.)
app.use(
  helmet({
    // CSP disabled for now — the SPA needs inline scripts/styles from Vite
    // Enable and tune once assets are stable
    contentSecurityPolicy: false,
  })
);

// Body parsing with tight per-route limits (set below per router)
// Global fallback kept small — only /api/config gets 2 MB
app.use(express.json({ limit: '50kb' }));

// Rate limiting par IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requêtes par minute
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
app.use('/api/translations', translationsRouter(db));

// ── System info ──────────────────────────────────────────────────────────────

/**
 * Returns the HA connection config the frontend needs to bootstrap HassConnect.
 * hassUrl is not returned (derived from window.location.origin on the browser side).
 * hassToken comes from /data/options.json ha_token (user-configured long-lived token).
 * In ingress mode this endpoint is protected by haAuthMiddleware.
 */
app.get('/api/system/ha-config', (_req, res) => {
  let hassToken = null;

  // Read ha_token from /data/options.json if present (set via HA add-on options)
  try {
    const optionsPath = process.env.OPTIONS_PATH || '/data/options.json';
    const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
    if (options.ha_token && typeof options.ha_token === 'string' && options.ha_token.trim()) {
      hassToken = options.ha_token.trim();
    }
  } catch {
    // /data/options.json absent (dev or standalone) — no token
  }

  res.json({ hassToken });
});

app.get('/api/system/ingress-url', async (_req, res) => {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) {
    return res.json({ url: null, reason: 'not_addon' });
  }
  try {
    const resp = await fetch('http://supervisor/addons/self/info', {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    if (!resp.ok) return res.json({ url: null, reason: 'supervisor_error' });
    const data = await resp.json();
    const ingressUrl = data?.data?.ingress_url;
    if (!ingressUrl) return res.json({ url: null, reason: 'no_ingress' });
    // ingressUrl is a path like /api/hassio_ingress/<token>/
    // We return it as-is so the frontend can build the full URL with window.location.origin
    res.json({ url: ingressUrl });
  } catch {
    res.json({ url: null, reason: 'fetch_error' });
  }
});

// ── Serve uploaded images ─────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', etag: true }));
app.use('/uploads/icons', express.static(path.join(UPLOADS_DIR, 'icons'), { maxAge: '7d', etag: true }));

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

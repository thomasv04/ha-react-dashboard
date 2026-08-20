import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.development', override: true });

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import { initDB, checkpoint } from './db.js';
import { configRouter } from './routes/config.js';
import { profilesRouter } from './routes/profiles.js';
import { settingsRouter } from './routes/settings.js';
import { uploadsRouter, pruneOrphanUploads } from './routes/uploads.js';
import { translationsRouter } from './routes/translations.js';
import { haAuthMiddleware, adminWrites, writeGuard, haTokenGuard } from './haAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8099;
const isProduction = process.env.NODE_ENV === 'production';

// ── Middlewares ────────────────────────────────────────────────────────────────

// Security headers (XSS, clickjacking, MIME-sniffing, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // Tailwind / CSS-in-JS generate inline styles at runtime.
        // fonts.googleapis.com : la feuille de style de Google Sans Flex,
        // référencée par index.html et utilisée par tout le thème.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        // Camera streams, weather icons, uploaded backgrounds from any origin
        imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
        // HA WebSocket (ws/wss) can be on any user-configured host
        connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
        // Media player artwork / streams
        mediaSrc: ["'self'", 'blob:', 'http:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        // helmet ajoute `upgrade-insecure-requests` par défaut. Derrière
        // l'ingress HA la page est servie en clair (http://homeassistant.local:8123) :
        // le navigateur réécrirait chaque asset en https://, qui n'écoute pas,
        // et tout le bundle tomberait en ERR_SSL_PROTOCOL_ERROR. C'est à HA de
        // terminer TLS, pas à l'add-on de l'exiger.
        upgradeInsecureRequests: null,
      },
    },
    // Même raison, en pire : HSTS n'est honoré qu'en HTTPS, mais il épingle
    // alors *toute* l'origine (homeassistant.local et ses sous-domaines) en
    // HTTPS pour un an — donc HA lui-même, pas seulement l'add-on. Une seule
    // visite en HTTPS suffirait à rendre l'accès en HTTP impossible ensuite.
    // C'est au reverse-proxy qui termine TLS de décider, pas à l'add-on.
    strictTransportSecurity: false,
  })
);

// Body parsing with tight per-route limits (set below per router)
// Global fallback kept small — only /api/config gets 2 MB
app.use(express.json({ limit: '50kb' }));

// ── Database ──────────────────────────────────────────────────────────────────
// Initialisée avant les middlewares d'authentification et de débit : la sonde
// de santé ci-dessous interroge la base et doit rester joignable sans jeton.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dashboard.db');
export const db = initDB(DB_PATH);

// ── Health check ─────────────────────────────────────────────────────────────

/**
 * Sonde lue par le watchdog du superviseur (cf. `watchdog:` dans config.yaml).
 *
 * Montée **avant** le rate-limiter et avant `haAuthMiddleware`, délibérément :
 *
 * - derrière le limiteur, un pic de trafic ferait échouer la sonde et
 *   redémarrer l'add-on — exactement au pire moment ;
 * - derrière l'authentification, le superviseur n'aurait aucun jeton à
 *   présenter et le watchdog redémarrerait en boucle un add-on parfaitement
 *   sain.
 *
 * Elle ne divulgue donc rien : un booléen et la disponibilité de la base.
 */
app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, db: 'up', uptime: Math.round(process.uptime()) });
  } catch (err) {
    console.error('[health] DB unreachable:', err.message);
    res.status(503).json({ ok: false, db: 'down' });
  }
});

// ── Rate limiting ────────────────────────────────────────────────────────────
//
// Clé sur l'utilisateur, pas sur l'IP : derrière l'ingress, toutes les requêtes
// portent l'adresse du superviseur. Un quota par IP était donc partagé par
// toute la maison — une tablette bavarde bloquait tout le monde. On retombe sur
// l'IP quand l'identité n'est pas connue (mode standalone sans en-tête, dev).
// `ipKeyGenerator` en repli : une IPv6 nue laisserait un quota par adresse d'un
// même préfixe /64, que n'importe quel client peut faire varier à volonté.
const clientKey = req => req.headers['x-remote-user-id'] || req.headers['x-ha-user-id'] || req.query?.device_id || ipKeyGenerator(req.ip);

const limiter = (max, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: clientKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

// Les lectures sont nombreuses et bon marché ; les écritures sont rares et
// coûteuses (2 Mo de configuration, images). Deux quotas, pas un.
app.use('/api/', limiter(300));
app.use('/api/', (req, res, next) => (req.method === 'GET' ? next() : limiter(30)(req, res, next)));

// ── Authentification et rôle ─────────────────────────────────────────────────
if (process.env.HA_AUTH === 'true') {
  app.use('/api/', haAuthMiddleware);
} else if (isProduction) {
  // Aucune authentification configurée en production : lecture seule. Cf.
  // `writeGuard` — le même raisonnement que pour le jeton HA ci-dessous.
  console.error('[ha-dashboard] HA_AUTH is not enabled: the API is served read-only.');
  app.use('/api/', writeGuard);
}

// ── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'data', 'uploads');

// Ménage au démarrage : le seul moment où plus personne n'est en train de
// choisir une image. Voir `pruneOrphanUploads` pour le délai de grâce.
if (process.env.NODE_ENV !== 'test') {
  try {
    pruneOrphanUploads(db, UPLOADS_DIR);
  } catch (err) {
    console.error('[uploads] Prune failed:', err.message);
  }
}

// ── API Routes ────────────────────────────────────────────────────────────────
//
// `adminWrites` sur tout ce qui est **partagé** : la configuration du
// dashboard, les profils, les traductions et les fichiers appartiennent au
// foyer entier. `/api/settings` en est délibérément exempt — thème,
// performances et mode kiosque sont propres à un appareil, et chacun doit
// pouvoir régler le sien.
app.use('/api/config', express.json({ limit: '2mb' }), adminWrites, configRouter(db));
app.use('/api/profiles', adminWrites, profilesRouter(db));
app.use('/api/settings', settingsRouter(db));
app.use('/api/uploads', adminWrites, uploadsRouter(db, UPLOADS_DIR));
app.use('/api/translations', adminWrites, translationsRouter(db));

// ── System info ──────────────────────────────────────────────────────────────

/**
 * Returns the HA connection config the frontend needs to bootstrap HassConnect.
 * hassUrl is not returned (derived from window.location.origin on the browser side).
 * hassToken comes from /data/options.json ha_token (user-configured long-lived token).
 * In ingress mode this endpoint is protected by haAuthMiddleware.
 */
app.get('/api/system/ha-config', haTokenGuard, (_req, res) => {
  let hassToken = null;

  // Ce point d'entrée rend un jeton HA de longue durée, souvent créé par un
  // administrateur : il vaut un accès complet à la maison. Sans authentification
  // devant `/api/`, n'importe qui joignant le port le récupérait. On refuse
  // plutôt que de le divulguer — le dashboard sait fonctionner sans (il retombe
  // sur le flux d'authentification de HA).
  if (isProduction && process.env.HA_AUTH !== 'true') {
    console.error('[ha-dashboard] HA_AUTH is not enabled: refusing to serve the HA token over an unauthenticated endpoint.');
    return res.json({ hassToken: null, reason: 'auth_disabled' });
  }

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

  // Le superviseur envoie SIGTERM à l'arrêt et lors d'une sauvegarde à chaud.
  // Fusionner le WAL avant de rendre la main évite qu'une copie de `/data`
  // reparte sans les dernières écritures (cf. checkpoint() dans db.js).
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      checkpoint(db);
      db.close();
      process.exit(0);
    });
  }
}

export default app;

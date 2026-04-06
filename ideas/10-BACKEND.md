# 10 — Backend avancé : SQLite, Profils, Auth, Rate Limiting

## Objectif

Faire évoluer le backend Express.js minimaliste (server.js avec JSON file) vers un backend robuste avec SQLite, profils multi-devices, authentification HA, rate limiting et chiffrement optionnel. Inspiré de l'architecture serveur de Tunet.

## Architecture cible

```
server/
├── index.js          // Express setup, middlewares, routes
├── db.js             // SQLite setup + migrations
├── haAuth.js         // Middleware d'authentification HA
├── routes/
│   ├── config.js     // GET/POST /api/config (existant, migré)
│   ├── profiles.js   // CRUD profils
│   └── settings.js   // Settings par device + sync
└── __tests__/
    ├── config.test.js
    ├── profiles.test.js
    └── haAuth.test.js
```

---

## Étape 1 : Installer les dépendances

```bash
npm install better-sqlite3 express-rate-limit
npm install -D @types/better-sqlite3
```

---

## Étape 2 : Migration du server.js monolithique

### Nouveau `server/index.js`

```javascript
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { initDB } from './db.js';
import { configRouter } from './routes/config.js';
import { profilesRouter } from './routes/profiles.js';
import { settingsRouter } from './routes/settings.js';
import { haAuthMiddleware } from './haAuth.js';

const app = express();
const PORT = process.env.PORT || 8099;
const isProduction = process.env.NODE_ENV === 'production';

// ── Middlewares ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// Rate limiting par IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 300,                  // 300 requêtes par minute
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
const db = initDB(process.env.DB_PATH || './data/dashboard.db');

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/config', configRouter(db));
app.use('/api/profiles', profilesRouter(db));
app.use('/api/settings', settingsRouter(db));

// ── Static files (SPA) ───────────────────────────────────────────────────────
if (isProduction) {
  const distPath = path.resolve(import.meta.dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[ha-dashboard] Server running on port ${PORT}`);
  });
}

export default app;
```

---

## Étape 3 : Base de données SQLite

### `server/db.js`

```javascript
import Database from 'better-sqlite3';

/**
 * Initialise la DB SQLite avec WAL mode pour de meilleures performances.
 * Crée les tables si elles n'existent pas (auto-migration).
 */
export function initDB(dbPath) {
  const db = new Database(dbPath);
  
  // WAL mode = lectures parallèles + écritures non-bloquantes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Table : dashboard config (remplacement du fichier JSON) ──────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 2,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Table : profils utilisateur ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      ha_user_id TEXT,
      label TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(ha_user_id)`);

  // ── Table : settings par device ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_settings (
      device_id TEXT PRIMARY KEY,
      ha_user_id TEXT,
      data TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Migration depuis fichier JSON (si le fichier existe et la DB est vide)
  migrateFromJSON(db);

  return db;
}

/**
 * Migration one-shot : lit dashboard_config.json et l'insère dans SQLite.
 * Supprime ensuite le fichier JSON pour éviter les doublons.
 */
function migrateFromJSON(db) {
  import('fs').then(fs => {
    const configPath = process.env.OPTIONS_FILE || './dashboard_config.json';
    if (!fs.existsSync(configPath)) return;

    const existing = db.prepare('SELECT COUNT(*) as count FROM dashboard_config').get();
    if (existing.count > 0) return; // DB déjà peuplée

    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const data = JSON.parse(raw);
      
      db.prepare(`
        INSERT INTO dashboard_config (id, version, data) VALUES (1, ?, ?)
      `).run(data.version ?? 1, JSON.stringify(data));

      console.log('[db] Migrated dashboard_config.json → SQLite');
      // On ne supprime pas le JSON pour backup, mais on log
    } catch (err) {
      console.error('[db] Migration error:', err.message);
    }
  });
}
```

---

## Étape 4 : Routes Config (migration depuis server.js)

### `server/routes/config.js`

```javascript
import { Router } from 'express';

export function configRouter(db) {
  const router = Router();

  // GET /api/config — Charger la config
  router.get('/', (_req, res) => {
    try {
      const row = db.prepare('SELECT data, version FROM dashboard_config WHERE id = 1').get();
      if (!row) {
        return res.json({ message: 'No configuration found' });
      }
      const config = JSON.parse(row.data);
      res.json(config);
    } catch (err) {
      console.error('[config] Load error:', err.message);
      res.status(500).json({ error: 'Failed to load config' });
    }
  });

  // POST /api/config — Sauvegarder la config
  router.post('/', (req, res) => {
    try {
      const config = req.body;
      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Invalid config' });
      }

      const version = config.version ?? 2;
      const data = JSON.stringify(config);

      db.prepare(`
        INSERT INTO dashboard_config (id, version, data, updated_at)
        VALUES (1, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          version = excluded.version,
          data = excluded.data,
          updated_at = datetime('now')
      `).run(version, data);

      res.json({ success: true });
    } catch (err) {
      console.error('[config] Save error:', err.message);
      res.status(500).json({ error: 'Failed to save config' });
    }
  });

  return router;
}
```

---

## Étape 5 : Routes Profils

### `server/routes/profiles.js`

```javascript
import { Router } from 'express';
import { randomUUID } from 'crypto';

export function profilesRouter(db) {
  const router = Router();

  // GET /api/profiles — Lister les profils
  router.get('/', (req, res) => {
    try {
      const userId = req.headers['x-ha-user-id'] || null;
      const rows = userId
        ? db.prepare('SELECT id, label, created_at, updated_at FROM profiles WHERE ha_user_id = ?').all(userId)
        : db.prepare('SELECT id, label, created_at, updated_at FROM profiles').all();
      
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list profiles' });
    }
  });

  // GET /api/profiles/:id — Récupérer un profil
  router.get('/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Profile not found' });
      res.json({ ...row, data: JSON.parse(row.data) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  // POST /api/profiles — Créer un profil
  router.post('/', (req, res) => {
    try {
      const { label, data } = req.body;
      if (!label || !data) {
        return res.status(400).json({ error: 'Missing label or data' });
      }

      const id = randomUUID();
      const userId = req.headers['x-ha-user-id'] || null;

      db.prepare(`
        INSERT INTO profiles (id, ha_user_id, label, data)
        VALUES (?, ?, ?, ?)
      `).run(id, userId, label, JSON.stringify(data));

      res.status(201).json({ id, label });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create profile' });
    }
  });

  // PUT /api/profiles/:id — Mettre à jour un profil
  router.put('/:id', (req, res) => {
    try {
      const { label, data } = req.body;

      const result = db.prepare(`
        UPDATE profiles SET
          label = COALESCE(?, label),
          data = COALESCE(?, data),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(label || null, data ? JSON.stringify(data) : null, req.params.id);

      if (result.changes === 0) return res.status(404).json({ error: 'Profile not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // DELETE /api/profiles/:id — Supprimer un profil
  router.delete('/:id', (req, res) => {
    try {
      const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ error: 'Profile not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  return router;
}
```

---

## Étape 6 : Authentification HA

### `server/haAuth.js`

```javascript
/**
 * Middleware d'authentification Home Assistant.
 * En mode add-on, HA injecte un header X-Ingress-Path + token dans le request.
 * En mode standalone, on vérifie un Bearer token dans l'Authorization header.
 */
export function haAuthMiddleware(req, res, next) {
  // Mode ingress (HA add-on) : le reverse proxy de HA gère l'auth
  if (req.headers['x-ingress-path']) {
    return next();
  }

  // Mode standalone : vérifier le Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  
  // Valider le token auprès de HA
  const haUrl = process.env.HA_URL || 'http://supervisor/core';
  fetch(`${haUrl}/api/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(resp => {
      if (resp.ok) {
        // Extraire le user_id si disponible
        req.headers['x-ha-user-id'] = req.headers['x-ha-user-id'] || 'default';
        next();
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    })
    .catch(() => {
      res.status(502).json({ error: 'Cannot reach Home Assistant' });
    });
}
```

---

## Étape 7 : Settings par device (optionnel)

### `server/routes/settings.js`

```javascript
import { Router } from 'express';

export function settingsRouter(db) {
  const router = Router();

  // GET /api/settings/current?device_id=xxx
  router.get('/current', (req, res) => {
    const deviceId = req.query.device_id || 'default';
    
    try {
      const row = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get(deviceId);
      if (!row) return res.json({ message: 'No settings', revision: 0 });
      res.json({ ...row, data: JSON.parse(row.data) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // PUT /api/settings/current — Sauvegarder (avec revision tracking)
  router.put('/current', (req, res) => {
    const { device_id = 'default', data, expected_revision } = req.body;
    
    try {
      // Vérifier la révision pour éviter les conflits
      const current = db.prepare('SELECT revision FROM device_settings WHERE device_id = ?').get(device_id);
      
      if (current && expected_revision !== undefined && current.revision !== expected_revision) {
        return res.status(409).json({
          error: 'Conflict',
          current_revision: current.revision,
          message: 'Settings were modified by another device',
        });
      }

      const newRevision = (current?.revision ?? 0) + 1;

      db.prepare(`
        INSERT INTO device_settings (device_id, ha_user_id, data, revision, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(device_id) DO UPDATE SET
          data = excluded.data,
          revision = excluded.revision,
          updated_at = datetime('now')
      `).run(device_id, req.headers['x-ha-user-id'] || null, JSON.stringify(data), newRevision);

      res.json({ success: true, revision: newRevision });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  return router;
}
```

---

## Étape 8 : Mettre à jour le Dockerfile

```dockerfile
# ... dans le stage runtime, ajouter :
# Créer le dossier data pour SQLite
RUN mkdir -p /data

# Variable d'environnement pour le chemin de la DB
ENV DB_PATH=/data/dashboard.db
```

---

## Étape 9 : Mise à jour du hook useDashboardConfig.ts côté client

Le hook existant continue de fonctionner — les routes `/api/config` sont les mêmes. Mais on peut ajouter un hook pour les profils :

### `src/hooks/useProfiles.ts`

```typescript
import { useState, useCallback } from 'react';

interface Profile {
  id: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (label: string, data: unknown) => {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, data }),
    });
    return res.json();
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const res = await fetch(`/api/profiles/${id}`);
    return res.json();
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    setProfiles(prev => prev.filter(p => p.id !== id));
  }, []);

  return { profiles, isLoading, loadProfiles, saveProfile, loadProfile, deleteProfile };
}
```

---

## Vérification

- [ ] `node server/index.js` démarre sans erreur
- [ ] La DB SQLite est créée automatiquement dans `./data/`
- [ ] GET/POST `/api/config` fonctionne comme avant
- [ ] La migration depuis `dashboard_config.json` fonctionne au premier démarrage
- [ ] Le rate limiting bloque après 300 requêtes/min
- [ ] Les profils CRUD fonctionnent (create, list, get, update, delete)
- [ ] Le revision tracking empêche les conflits d'écriture
- [ ] Le Docker build fonctionne toujours

## Améliorations futures

- [ ] Chiffrement des données au repos (crypto.createCipher)
- [ ] Export/Import JSON de la config complète
- [ ] Sync cross-device via SSE (Server-Sent Events)
- [ ] Historique des modifications (table audit log)
- [ ] Health check endpoint `/api/health`

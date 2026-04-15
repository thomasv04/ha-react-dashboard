import { Router } from 'express';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function configRouter(db) {
  const router = Router();

  // GET /api/config — Charger la config
  router.get('/', (_req, res) => {
    try {
      const row = db.prepare('SELECT data, version FROM dashboard_config WHERE id = 1').get();
      if (!row) {
        return res.json({ message: 'No config yet', layout: [] });
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
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return res.status(400).json({ error: 'Invalid config: must be an object' });
      }

      // Basic structure validation
      if (config.version !== undefined && typeof config.version !== 'number') {
        return res.status(400).json({ error: 'Invalid config: version must be a number' });
      }
      if (config.pages !== undefined && !Array.isArray(config.pages)) {
        return res.status(400).json({ error: 'Invalid config: pages must be an array' });
      }

      const version = typeof config.version === 'number' ? config.version : 2;
      const data = JSON.stringify(config);

      db.prepare(
        `
        INSERT INTO dashboard_config (id, version, data, updated_at)
        VALUES (1, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          version = excluded.version,
          data = excluded.data,
          updated_at = datetime('now')
      `
      ).run(version, data);

      res.json({ success: true });
    } catch (err) {
      console.error('[config] Save error:', err.message);
      res.status(500).json({ error: 'Failed to save config' });
    }
  });

  return router;
}

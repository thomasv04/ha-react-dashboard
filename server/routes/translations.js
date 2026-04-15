import { Router } from 'express';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function translationsRouter(db) {
  const router = Router();

  // Ensure table exists (idempotent — called after initDB)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_overrides (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // GET /api/translations/overrides
  router.get('/overrides', (_req, res) => {
    try {
      const row = db.prepare('SELECT data FROM translation_overrides WHERE id = 1').get();
      res.json({ overrides: row ? JSON.parse(row.data) : {} });
    } catch (err) {
      console.error('[translations] Get error:', err.message);
      res.status(500).json({ error: 'Failed to get overrides' });
    }
  });

  // PUT /api/translations/overrides
  router.put('/overrides', (req, res) => {
    const { overrides } = req.body ?? {};

    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return res.status(400).json({ error: 'Invalid overrides data' });
    }

    // Validate: keys must be dot-notation strings, values must be strings
    for (const [k, v] of Object.entries(overrides)) {
      if (typeof k !== 'string' || typeof v !== 'string') {
        return res.status(400).json({ error: 'All keys and values must be strings' });
      }
      if (k.length > 256 || v.length > 2048) {
        return res.status(400).json({ error: 'Key or value too long' });
      }
    }

    try {
      db.prepare(
        `
        INSERT INTO translation_overrides (id, data, updated_at)
        VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          updated_at = datetime('now')
      `
      ).run(JSON.stringify(overrides));

      res.json({ success: true });
    } catch (err) {
      console.error('[translations] Save error:', err.message);
      res.status(500).json({ error: 'Failed to save overrides' });
    }
  });

  return router;
}

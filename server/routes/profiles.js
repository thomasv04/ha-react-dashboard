import { Router } from 'express';
import { randomUUID } from 'crypto';

/**
 * @param {import('better-sqlite3').Database} db
 */
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
      console.error('[profiles] List error:', err.message);
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
      console.error('[profiles] Get error:', err.message);
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

      db.prepare(
        `
        INSERT INTO profiles (id, ha_user_id, label, data)
        VALUES (?, ?, ?, ?)
      `
      ).run(id, userId, label, JSON.stringify(data));

      res.status(201).json({ id, label });
    } catch (err) {
      console.error('[profiles] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create profile' });
    }
  });

  // PUT /api/profiles/:id — Mettre à jour un profil
  router.put('/:id', (req, res) => {
    try {
      const { label, data } = req.body;

      const result = db
        .prepare(
          `
        UPDATE profiles SET
          label = COALESCE(?, label),
          data = COALESCE(?, data),
          updated_at = datetime('now')
        WHERE id = ?
      `
        )
        .run(label ?? null, data ? JSON.stringify(data) : null, req.params.id);

      if (result.changes === 0) return res.status(404).json({ error: 'Profile not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[profiles] Update error:', err.message);
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
      console.error('[profiles] Delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  return router;
}

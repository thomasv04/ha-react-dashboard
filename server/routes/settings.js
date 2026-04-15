import { Router } from 'express';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function settingsRouter(db) {
  const router = Router();

  // Sanitize device_id: alphanumeric + dash/underscore, max 128 chars
  function sanitizeDeviceId(raw) {
    if (typeof raw === 'string' && /^[\w\-]{1,128}$/.test(raw)) return raw;
    return 'default';
  }

  // GET /api/settings/current?device_id=xxx
  router.get('/current', (req, res) => {
    const deviceId = sanitizeDeviceId(req.query.device_id);

    try {
      const row = db.prepare('SELECT * FROM device_settings WHERE device_id = ?').get(deviceId);
      if (!row) return res.json({ message: 'No settings', revision: 0 });
      res.json({ ...row, data: JSON.parse(row.data) });
    } catch (err) {
      console.error('[settings] Get error:', err.message);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  // PUT /api/settings/current — Sauvegarder (avec revision tracking)
  router.put('/current', (req, res) => {
    const rawDeviceId = req.body?.device_id;
    const sanitizedDeviceId = sanitizeDeviceId(rawDeviceId);
    const { data, expected_revision } = req.body ?? {};

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    try {
      // Vérifier la révision pour éviter les conflits
      const current = db
        .prepare('SELECT revision FROM device_settings WHERE device_id = ?')
        .get(sanitizedDeviceId);

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
      `).run(
        sanitizedDeviceId,
        req.headers['x-ha-user-id'] || null,
        JSON.stringify(data),
        newRevision,
      );

      res.json({ success: true, revision: newRevision });
    } catch (err) {
      console.error('[settings] Save error:', err.message);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  return router;
}

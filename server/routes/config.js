import { Router } from 'express';
import { checkpoint, CONFIG_HISTORY_LIMIT } from '../db.js';

/**
 * Configuration du dashboard : une seule ligne (`id = 1`), historisée.
 *
 * Deux garde-fous, pour deux pertes de données distinctes :
 *
 * - **l'historique** (`config_history`) protège du geste malheureux — import
 *   raté, disposition cassée en mode édition. L'ancienne valeur est archivée
 *   avant chaque écriture, on peut revenir en arrière.
 * - **la révision** protège de l'écrasement concurrent — deux tablettes en
 *   mode édition, la seconde à enregistrer effaçait le travail de la première
 *   sans un mot.
 *
 * La révision voyage par en-tête (`X-Config-Revision` en réponse,
 * `X-Expected-Revision` en requête) et non dans le corps : celui-ci *est* la
 * configuration, y glisser un champ de protocole finirait par être réenregistré
 * comme s'il en faisait partie.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function configRouter(db) {
  const router = Router();

  /** Lit la ligne courante, ou `null` si la base est vierge. */
  const readCurrent = () => db.prepare('SELECT data, version, revision FROM dashboard_config WHERE id = 1').get() ?? null;

  /**
   * Archive l'état courant puis écrit le nouveau, en une transaction.
   * @returns {number} la nouvelle révision
   */
  const writeConfig = db.transaction((data, version, label) => {
    const current = readCurrent();

    // Deux enregistrements identiques d'affilée ne méritent pas deux entrées :
    // l'historique se remplirait de doublons et les 20 places disponibles
    // seraient consommées sans qu'aucun état distinct ne soit récupérable.
    if (current && current.data !== data) {
      db.prepare('INSERT INTO config_history (data, version, size, label) VALUES (?, ?, ?, ?)').run(
        current.data,
        current.version,
        current.data.length,
        label ?? null
      );
      db.prepare(
        `DELETE FROM config_history
         WHERE id NOT IN (SELECT id FROM config_history ORDER BY id DESC LIMIT ?)`
      ).run(CONFIG_HISTORY_LIMIT);
    }

    const revision = (current?.revision ?? 0) + 1;
    db.prepare(
      `
      INSERT INTO dashboard_config (id, version, data, revision, updated_at)
      VALUES (1, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        data = excluded.data,
        revision = excluded.revision,
        updated_at = datetime('now')
    `
    ).run(version, data, revision);

    return revision;
  });

  // ── GET /api/config — Charger la config ───────────────────────────────────
  router.get('/', (_req, res) => {
    try {
      const row = readCurrent();
      if (!row) {
        res.set('X-Config-Revision', '0');
        return res.json({ message: 'No config yet', layout: [] });
      }
      res.set('X-Config-Revision', String(row.revision));
      res.json(JSON.parse(row.data));
    } catch (err) {
      console.error('[config] Load error:', err.message);
      res.status(500).json({ error: 'Failed to load config' });
    }
  });

  // ── GET /api/config/history — Lister les états archivés ───────────────────
  // Les données ne sont pas renvoyées : la liste sert à choisir, pas à charger.
  router.get('/history', (_req, res) => {
    try {
      const rows = db.prepare('SELECT id, version, size, label, created_at FROM config_history ORDER BY id DESC').all();
      res.json(rows);
    } catch (err) {
      console.error('[config] History error:', err.message);
      res.status(500).json({ error: 'Failed to list history' });
    }
  });

  // ── POST /api/config/history/:id/restore — Revenir à un état archivé ──────
  router.post('/history/:id/restore', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid history id' });
    }

    try {
      const row = db.prepare('SELECT data, version FROM config_history WHERE id = ?').get(id);
      if (!row) return res.status(404).json({ error: 'History entry not found' });

      // La restauration passe par le chemin d'écriture normal : l'état courant
      // est donc lui-même archivé. Se tromper de point de restauration reste
      // rattrapable.
      const revision = writeConfig(row.data, row.version, 'avant restauration');
      checkpoint(db);
      res.json({ success: true, revision });
    } catch (err) {
      console.error('[config] Restore error:', err.message);
      res.status(500).json({ error: 'Failed to restore config' });
    }
  });

  // ── PUT /api/config — Sauvegarder ─────────────────────────────────────────
  router.put('/', (req, res) => {
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

      // En-tête absent = client qui ne gère pas encore la révision, ou import
      // volontairement écrasant. On n'impose pas : refuser casserait les
      // versions déjà déployées, sans rien protéger de plus.
      const expected = req.headers['x-expected-revision'];
      if (expected !== undefined) {
        const current = readCurrent();
        if (current && current.revision !== Number(expected)) {
          return res.status(409).json({
            error: 'Conflict',
            current_revision: current.revision,
            message: 'Config was modified by another device',
          });
        }
      }

      const version = typeof config.version === 'number' ? config.version : 2;
      const revision = writeConfig(JSON.stringify(config), version, null);

      // La configuration change rarement (une modification de dashboard). Fusionner
      // le WAL tout de suite coûte quelques kilo-octets et garantit qu'une
      // sauvegarde Home Assistant déclenchée juste après emporte bien ce qu'on
      // vient d'enregistrer.
      checkpoint(db);

      res.set('X-Config-Revision', String(revision));
      res.json({ success: true, revision });
    } catch (err) {
      console.error('[config] Save error:', err.message);
      res.status(500).json({ error: 'Failed to save config' });
    }
  });

  return router;
}

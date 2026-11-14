import { Router } from 'express';
import { MassError } from '../music.js';

/**
 * Les réglages Music Assistant saisis dans les Paramètres du dashboard.
 *
 *   GET    /api/music/settings  → { configured, url, source } — jamais le jeton
 *   PUT    /api/music/settings  { url?, token } → teste la connexion, puis garde
 *   DELETE /api/music/settings  → oublie (retour aux options de l'add-on)
 *
 * Enregistrés dans la base de l'add-on : une seule fois pour tous les appareils,
 * et compris dans ses sauvegardes. Écriture réservée aux administrateurs
 * (`adminWrites` au montage) : ce jeton ouvre la musique de toute la maison.
 *
 * @param {ReturnType<import('../music.js').createMassManager>} manager
 */
export function musicSettingsRouter(manager) {
  const router = Router();

  router.get('/', (_req, res) => res.json(manager.status()));

  router.put('/', async (req, res) => {
    const { url = '', token } = req.body ?? {};
    if (typeof token !== 'string' || !token.trim() || token.length > 4096) return res.status(400).json({ error: 'invalid_token' });
    if (typeof url !== 'string' || (url.trim() && !/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(url.trim()))) {
      return res.status(400).json({ error: 'invalid_url' });
    }
    // Hors add-on, pas d'adresse par défaut : sans adresse, rien à joindre.
    if (!url.trim() && !manager.status().url) return res.status(400).json({ error: 'missing_url' });
    try {
      // On ne garde qu'un jeton qui marche : sinon la file retomberait en silence sur la version réduite.
      await manager.test({ url, token: token.trim() });
    } catch (err) {
      const kind = err instanceof MassError ? err.kind : 'unreachable';
      // Pas de 401 : le dashboard le prendrait pour un refus de HA.
      return res.status(kind === 'auth' ? 424 : 502).json({ error: kind });
    }
    manager.save({ url, token: token.trim() });
    return res.json(manager.status());
  });

  router.delete('/', (_req, res) => {
    manager.clear();
    res.json(manager.status());
  });

  return router;
}

import { Router } from 'express';
import { MassError } from '../music.js';

/** Un identifiant de file MA : celui du lecteur (UUID ou nom simple). */
const QUEUE_ID = /^[\w.-]{1,100}$/;
const ITEM_ID = /^[\w.-]{1,100}$/;

/**
 * Une image MA : un objet `{ path, provider, remotely_accessible }`. Seule une
 * image publique (une URL `http`) se montre telle quelle ; les autres passent
 * par le proxy d'images de MA, que la tablette ne joint pas.
 */
function imageUrl(image) {
  if (!image || typeof image !== 'object') return null;
  return image.remotely_accessible && /^https?:\/\//.test(String(image.path)) ? String(image.path) : null;
}

/** Un titre de la file, réduit à ce que l'écran montre. */
export function toQueueItem(item) {
  const media = item?.media_item ?? {};
  const images = Array.isArray(media.metadata?.images) ? media.metadata.images : [];
  return {
    queue_item_id: String(item?.queue_item_id ?? ''),
    name: String(media.name || item?.name || ''),
    artists: Array.isArray(media.artists) ? media.artists.map(a => String(a?.name ?? '')).filter(Boolean) : [],
    duration: typeof item?.duration === 'number' ? item.duration : null,
    image: imageUrl(item?.image) ?? imageUrl(media.image) ?? imageUrl(images.find(i => i?.type === 'thumb')) ?? null,
  };
}

/**
 * La file d'attente complète, par l'API de Music Assistant (voir `music.js`).
 *
 *   GET  /api/music/queue/:queueId?offset&limit  → les titres de la file, dans l'ordre
 *   POST /api/music/queue/:queueId/move    { queue_item_id, pos_shift }
 *   POST /api/music/queue/:queueId/delete  { queue_item_id }
 *   POST /api/music/queue/:queueId/play    { index }
 *
 * Sans jeton MA configuré : 503 `not_configured`, et le dashboard garde la file
 * réduite que HA fournit. Ouvert à tous les comptes HA, comme les commandes de
 * lecture : piloter la musique n'est pas une écriture d'administrateur.
 *
 * @param {() => { request: (command: string, args?: Record<string, unknown>) => Promise<unknown> } | null} getClient
 */
export function musicRouter(getClient) {
  const router = Router();

  /** Exécute une commande MA et traduit ses échecs en codes HTTP. */
  const run = async (res, command, args, shape = result => result ?? { ok: true }) => {
    const client = getClient();
    if (!client) return res.status(503).json({ error: 'not_configured' });
    try {
      const result = await client.request(command, args);
      return res.json(shape(result));
    } catch (err) {
      const kind = err instanceof MassError ? err.kind : 'command';
      console.error(`[music] ${command}:`, err.message);
      // Pas de 401 pour un jeton MA refusé : le dashboard le prendrait pour un refus de HA et réessaierait.
      return res.status(kind === 'auth' ? 424 : kind === 'unreachable' ? 502 : 400).json({ error: kind });
    }
  };

  router.param('queueId', (req, res, next, id) => (QUEUE_ID.test(id) ? next() : res.status(400).json({ error: 'invalid_queue' })));

  router.get('/queue/:queueId', (req, res) => {
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? '0'), 10) || 0);
    const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit ?? '200'), 10) || 200));
    return run(res, 'player_queues/items', { queue_id: req.params.queueId, limit, offset }, items =>
      Array.isArray(items) ? items.map(toQueueItem) : []
    );
  });

  router.post('/queue/:queueId/move', (req, res) => {
    const { queue_item_id: itemId, pos_shift: shift } = req.body ?? {};
    if (typeof itemId !== 'string' || !ITEM_ID.test(itemId) || !Number.isInteger(shift) || Math.abs(shift) > 1000) {
      return res.status(400).json({ error: 'invalid_move' });
    }
    return run(res, 'player_queues/move_item', { queue_id: req.params.queueId, queue_item_id: itemId, pos_shift: shift });
  });

  router.post('/queue/:queueId/delete', (req, res) => {
    const { queue_item_id: itemId } = req.body ?? {};
    if (typeof itemId !== 'string' || !ITEM_ID.test(itemId)) return res.status(400).json({ error: 'invalid_item' });
    return run(res, 'player_queues/delete_item', { queue_id: req.params.queueId, item_id_or_index: itemId });
  });

  router.post('/queue/:queueId/play', (req, res) => {
    const { index } = req.body ?? {};
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ error: 'invalid_index' });
    return run(res, 'player_queues/play_index', { queue_id: req.params.queueId, index });
  });

  return router;
}

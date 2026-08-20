/**
 * Authentification et rôle Home Assistant.
 *
 * Contrôlé par la variable d'environnement HA_AUTH_MODE :
 *   - 'ingress'    : HA add-on derrière le reverse proxy HA (vérifie x-ingress-path)
 *   - 'standalone' : Bearer token HA (défaut)
 *   - 'disabled'   : pas d'auth (DEV LOCAL UNIQUEMENT)
 *
 * Le middleware pose `req.haUser = { id, isAdmin }`. `requireAdmin` s'appuie
 * dessus pour réserver les écritures **partagées** — configuration, profils,
 * traductions, fichiers — aux administrateurs. Les réglages propres à un
 * appareil (`/api/settings`) restent ouverts : les verrouiller empêcherait une
 * tablette murale ou le téléphone d'un proche de choisir son propre affichage.
 */

/** Durée de mise en cache d'un rôle, par jeton. */
const ROLE_TTL_MS = 5 * 60 * 1000;
/** Plafond du cache, pour qu'il ne grossisse pas indéfiniment. */
const ROLE_CACHE_MAX = 200;

/** @type {Map<string, { isAdmin: boolean, expires: number }>} */
const roleCache = new Map();

/**
 * Interroge Home Assistant sur le porteur d'un jeton.
 *
 * Passe par le WebSocket et non par l'API REST : `auth/current_user` est le
 * seul point d'entrée qui rende le rôle, et REST n'a pas d'équivalent. La même
 * connexion valide le jeton (`auth_ok`) — inutile de le vérifier deux fois.
 *
 * `globalThis.WebSocket` est natif depuis Node 22, celui de l'image Docker :
 * pas de dépendance à ajouter.
 *
 * @param {string} haUrl
 * @param {string} token
 * @returns {Promise<{ ok: true, isAdmin: boolean } | { ok: false, reason: 'invalid' | 'unreachable' }>}
 */
function fetchUserRole(haUrl, token) {
  return new Promise(resolve => {
    let ws;
    try {
      ws = new WebSocket(`${haUrl.replace(/^http/, 'ws')}/api/websocket`);
    } catch {
      return resolve({ ok: false, reason: 'unreachable' });
    }

    const finish = result => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // Socket déjà fermée — rien à faire.
      }
      resolve(result);
    };

    // Sans délai maximal, une instance HA qui accepte la connexion mais ne
    // répond plus laisserait la requête HTTP en suspens indéfiniment.
    const timer = setTimeout(() => finish({ ok: false, reason: 'unreachable' }), 5_000);

    ws.onerror = () => finish({ ok: false, reason: 'unreachable' });
    ws.onclose = () => finish({ ok: false, reason: 'unreachable' });

    ws.onmessage = event => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      } else if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({ id: 1, type: 'auth/current_user' }));
      } else if (msg.type === 'auth_invalid') {
        finish({ ok: false, reason: 'invalid' });
      } else if (msg.type === 'result' && msg.id === 1) {
        finish(msg.success ? { ok: true, isAdmin: msg.result?.is_admin === true } : { ok: false, reason: 'invalid' });
      }
    };
  });
}

/**
 * Rôle du porteur d'un jeton, mis en cache.
 *
 * Sans cache, chaque appel d'API ouvrirait un WebSocket vers Home Assistant :
 * un chargement de dashboard en déclenche une dizaine.
 */
async function resolveRole(haUrl, token) {
  const hit = roleCache.get(token);
  if (hit && hit.expires > Date.now()) return { ok: true, isAdmin: hit.isAdmin };

  const result = await fetchUserRole(haUrl, token);
  if (!result.ok) return result;

  // ponytail: éviction naïve du plus ancien inséré, suffisante pour une
  // poignée d'appareils. Passer à une vraie LRU si le cache devient chaud.
  if (roleCache.size >= ROLE_CACHE_MAX) {
    roleCache.delete(roleCache.keys().next().value);
  }
  roleCache.set(token, { isAdmin: result.isAdmin, expires: Date.now() + ROLE_TTL_MS });
  return result;
}

/** Vide le cache des rôles (tests). */
export function clearRoleCache() {
  roleCache.clear();
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function haAuthMiddleware(req, res, next) {
  const authMode = process.env.HA_AUTH_MODE || 'standalone'; // 'ingress' | 'standalone' | 'disabled'

  // Mode ingress : on fait confiance au header seulement si le mode est explicitement configuré
  if (authMode === 'ingress') {
    if (req.headers['x-ingress-path']) {
      // Le superviseur authentifie mais ne transmet pas le rôle. C'est
      // `panel_admin: true` (config.yaml) qui restreint l'accès au panneau :
      // obtenir une session d'ingress suppose donc déjà d'être administrateur.
      // Ce `isAdmin: true` reflète cette décision, il ne la prend pas.
      req.haUser = { id: req.headers['x-remote-user-id'] ?? null, isAdmin: true };
      req.headers['x-ha-user-id'] = req.haUser.id ?? req.headers['x-ha-user-id'];
      return next();
    }
    // Header ingress absent alors qu'on est en mode ingress = requête suspecte
    return res.status(401).json({ error: 'Missing ingress header' });
  }

  // Mode disabled : pas d'auth (dev local uniquement)
  if (authMode === 'disabled') {
    if (process.env.NODE_ENV === 'production') {
      // Erreur fatale : ne jamais désactiver l'auth en prod
      return res.status(500).json({ error: 'Auth disabled in production is not allowed' });
    }
    console.warn('[haAuth] WARNING: Authentication is disabled. Do not use in production.');
    req.haUser = { id: 'dev', isAdmin: true };
    return next();
  }

  // Mode standalone (défaut) : Bearer token HA
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  // Valider le token auprès de HA
  const haUrl = process.env.HA_URL || 'http://supervisor/core';

  // Safety check: warn if HA_URL points to a non-local address in standalone mode.
  // This prevents accidentally forwarding Bearer tokens to external hosts.
  try {
    const parsed = new URL(haUrl);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === 'supervisor' ||
      /^10\./.test(parsed.hostname) ||
      /^192\.168\./.test(parsed.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname);
    if (!isLocal) {
      console.warn(
        `[haAuth] WARNING: HA_URL (${parsed.hostname}) does not appear to be a local address. ` +
          'Bearer tokens will be forwarded to this host. Verify your configuration.'
      );
    }
  } catch {
    return res.status(500).json({ error: 'Invalid HA_URL configuration' });
  }

  resolveRole(haUrl, token)
    .then(result => {
      if (!result.ok) {
        return result.reason === 'invalid'
          ? res.status(401).json({ error: 'Invalid token' })
          : res.status(502).json({ error: 'Cannot reach Home Assistant' });
      }
      req.haUser = { id: req.headers['x-ha-user-id'] ?? null, isAdmin: result.isAdmin };
      req.headers['x-ha-user-id'] = req.headers['x-ha-user-id'] || 'default';
      next();
    })
    .catch(() => res.status(502).json({ error: 'Cannot reach Home Assistant' }));
}

/** Méthodes qui ne modifient rien. */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Réserve les **écritures** d'une route aux administrateurs.
 *
 * Le pendant Express de `require_admin` côté intégration
 * (`custom_components/ha_react_dashboard/api.py`), qui décore lui aussi
 * `put`/`post`/`delete` mais jamais `get`. Jusqu'ici le verrou n'existait que
 * dans le frontend, qui se contente de masquer le bouton d'édition : n'importe
 * quel membre du foyer pouvait réécrire la configuration partagée par un appel
 * direct.
 *
 * Les lectures restent ouvertes, et doivent le rester : la configuration du
 * dashboard, les traductions et les icônes sont ce que *tout* le monde affiche.
 * Les verrouiller rendrait le dashboard illisible pour les non-administrateurs.
 *
 * Sans authentification active (`HA_AUTH` absent, développement local), il n'y
 * a pas de rôle à vérifier : c'est `writeGuard` qui interdit alors les
 * écritures en production.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function adminWrites(req, res, next) {
  if (READ_METHODS.has(req.method)) return next();
  if (!req.haUser) return next();
  if (!req.haUser.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

/**
 * Réserve le jeton Home Assistant de longue durée aux administrateurs.
 *
 * Être authentifié ne suffit pas : ce jeton appartient à l'administrateur qui
 * l'a créé et vaut un accès complet à la maison. En mode `standalone`,
 * n'importe quel membre du foyer disposant d'un compte HA passait
 * `haAuthMiddleware` et repartait avec — une élévation de privilège en une
 * requête. Le mode ingress est déjà couvert par `panel_admin: true`, mais
 * c'est une protection du superviseur, pas la nôtre : on la double ici.
 *
 * Répond 200 avec un jeton nul, et non 403 : le dashboard sait fonctionner
 * sans jeton — il retombe sur le flux d'authentification de Home Assistant, où
 * l'utilisateur s'identifie avec *ses* droits. Une erreur laisserait croire à
 * une panne là où le repli est parfaitement normal.
 *
 * `!req.haUser` = aucune authentification configurée (développement local) ;
 * c'est alors la garde de production, dans la route, qui tranche — même
 * raisonnement que {@link adminWrites}.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function haTokenGuard(req, res, next) {
  if (!req.haUser || req.haUser.isAdmin) return next();
  console.warn('[ha-dashboard] Refusing to serve the HA token to a non-admin user.');
  return res.json({ hassToken: null, reason: 'not_admin' });
}

/**
 * Interdit les écritures quand rien n'authentifie l'appelant.
 *
 * `HA_AUTH` est optionnel : sans lui, `PUT /api/config`, `/api/uploads` et
 * `/api/profiles` étaient ouverts à quiconque joignait le port. Le jeton HA
 * était déjà protégé de ce cas (cf. `/api/system/ha-config`) ; les écritures
 * méritent la même prudence. Lecture toujours permise : un dashboard mural
 * derrière un pare-feu reste utilisable.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function writeGuard(req, res, next) {
  if (READ_METHODS.has(req.method)) return next();
  return res.status(503).json({
    error: 'Read-only: authentication is not configured',
    message: 'Set HA_AUTH=true to enable writes.',
  });
}

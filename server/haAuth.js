/**
 * Middleware d'authentification Home Assistant.
 * Contrôlé par la variable d'environnement HA_AUTH_MODE :
 *   - 'ingress'    : HA add-on derrière le reverse proxy HA (vérifie x-ingress-path)
 *   - 'standalone' : Bearer token HA (défaut)
 *   - 'disabled'   : pas d'auth (DEV LOCAL UNIQUEMENT)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function haAuthMiddleware(req, res, next) {
  const authMode = process.env.HA_AUTH_MODE || 'standalone'; // 'ingress' | 'standalone' | 'disabled'

  // Mode ingress : on fait confiance au header seulement si le mode est explicitement configuré
  if (authMode === 'ingress') {
    if (req.headers['x-ingress-path']) {
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
        'Bearer tokens will be forwarded to this host. Verify your configuration.',
      );
    }
  } catch {
    return res.status(500).json({ error: 'Invalid HA_URL configuration' });
  }

  fetch(`${haUrl}/api/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(resp => {
      if (resp.ok) {
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

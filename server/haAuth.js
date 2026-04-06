/**
 * Middleware d'authentification Home Assistant.
 * En mode add-on, HA injecte le header X-Ingress-Path (le proxy gère l'auth).
 * En mode standalone, on vérifie un Bearer token auprès de l'API HA.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
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

/**
 * Detects the correct API base URL at runtime.
 *
 * When running as a Home Assistant add-on via ingress, the app is served at:
 *   http://homeassistant.local:8123/api/hassio_ingress/<token>/
 *
 * A bare `/api/config` fetch resolves to HA's own API (401/404).
 * All API calls must be prefixed with the ingress path.
 *
 * In dev, window.location.pathname is '/' → no prefix, Vite proxy handles /api/*.
 */
function detectApiBase(): string {
  const path = window.location.pathname;
  const m = path.match(/^(\/api\/hassio_ingress\/[^/]+\/)/);
  return m ? m[1] : '/';
}

const API_BASE = detectApiBase();

/**
 * Build the correct absolute URL for an API path.
 * @param path - e.g. '/api/config' or `/api/profiles/${id}`
 */
export function apiUrl(path: string): string {
  return API_BASE + path.replace(/^\//, '');
}

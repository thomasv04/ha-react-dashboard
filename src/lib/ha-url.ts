/**
 * Adresses HTTP de l'instance Home Assistant réellement connectée.
 *
 * Home Assistant renvoie souvent des chemins relatifs à sa propre origine —
 * `entity_picture` d'un lecteur (`/api/media_player_proxy/…`), avatar d'une
 * personne, média résolu. Les préfixer d'une adresse écrite en dur
 * (`http://homeassistant.local:8123`) les rendait invisibles dès que HA vivait
 * ailleurs : IP, autre port, HTTPS, accès distant (issue #61).
 *
 * L'origine se déduit de la socket : c'est l'adresse à laquelle on parle
 * vraiment. Sans socket, `VITE_HA_URL` ; sans rien, le chemin reste relatif —
 * ce qui est juste en mode carte et en ingress, servis par HA lui-même.
 */

/** `wss://hote:port/api/websocket` → `https://hote:port` ; `''` si l'URL est illisible. */
export function haBaseFromSocketUrl(wsUrl: string | undefined | null): string {
  if (!wsUrl) return '';
  try {
    const u = new URL(wsUrl);
    const protocol = u.protocol === 'wss:' || u.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${u.host}`;
  } catch {
    return '';
  }
}

/** Origine HTTP de HA : la socket d'abord, puis `VITE_HA_URL`, puis rien. */
export function haBaseUrl(wsUrl: string | undefined | null, envUrl: string | undefined | null): string {
  return haBaseFromSocketUrl(wsUrl) || (envUrl ?? '').replace(/\/+$/, '');
}

/**
 * Une adresse affichable : les URL absolues (`http(s):`, `data:`, `blob:`)
 * passent telles quelles, un chemin absolu reçoit l'origine de HA.
 */
export function resolveHaUrl(url: string | undefined | null, base: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url) || url.startsWith('//')) return url;
  if (!url.startsWith('/')) return url;
  return `${base.replace(/\/+$/, '')}${url}`;
}

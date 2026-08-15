import { useHass } from '@hakit/core';

/**
 * Base http(s) de Home Assistant, dérivée de l'URL du WebSocket.
 *
 * Les chemins d'images renvoyés par HA (`/api/camera_proxy/…`, `/local/…`) sont
 * relatifs à la racine : servis depuis HA ils résolvent seuls, mais en dev le
 * bundle tourne sur un autre port et il faut les préfixer.
 */
export function useHaBaseUrl(): string | undefined {
  const wsUrl = useHass(s => s.connection?.socket?.url as string | undefined);
  if (!wsUrl) return undefined;
  return wsUrl.replace(/^wss?:\/\//, 'http' + (wsUrl.startsWith('wss') ? 's' : '') + '://').replace(/\/api\/websocket$/, '');
}

/**
 * URL absolue de l'image d'une entité — l'attribut `entity_picture` : instantané
 * de caméra, avatar de personne, pochette d'album.
 *
 * Pour une caméra, HA y expose `/api/camera_proxy/<entity>?token=…`, c'est-à-dire
 * la dernière image fixe connue.
 */
export function useEntityPicture(entityId?: string): string | undefined {
  const picture = useHass(s =>
    entityId ? ((s.entities?.[entityId]?.attributes as { entity_picture?: string } | undefined)?.entity_picture ?? undefined) : undefined
  );
  const baseUrl = useHaBaseUrl();
  if (!picture) return undefined;
  return /^https?:\/\//.test(picture) ? picture : `${baseUrl ?? ''}${picture}`;
}

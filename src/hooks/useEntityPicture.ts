import { useHass } from '@hakit/core';
import { useHaUrl } from './useHaUrl';

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
  // `useHaUrl` : la même résolution partout, `VITE_HA_URL` et `data:` compris.
  return useHaUrl()(picture);
}

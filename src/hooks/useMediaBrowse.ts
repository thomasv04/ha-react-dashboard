import { useEffect, useState } from 'react';
import { useHass } from '@hakit/core';

/** Un élément de la bibliothèque d'un lecteur (`BrowseMedia` de Home Assistant). */
export interface MediaItem {
  title: string;
  thumbnail?: string | null;
  media_content_id: string;
  media_content_type: string;
  can_play: boolean;
  can_expand: boolean;
}

interface BrowseResult {
  children?: MediaItem[];
}

/** Assez pour une rangée qui défile, sans charger toute une bibliothèque. */
const MAX_ITEMS = 12;

/**
 * Ce qu'on peut lancer depuis la bibliothèque du lecteur, pour la rangée
 * « À écouter » de la fiche. La racine ne liste souvent que des catégories
 * (Playlists, Favoris…) : on descend alors dans la première.
 *
 * Silencieux en cas d'échec — lecteur sans bibliothèque, mode démo : la
 * rangée n'apparaît simplement pas.
 */
export function useMediaBrowse(entityId: string, enabled: boolean): MediaItem[] {
  const connection = useHass(s => s.connection);
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!enabled || !connection || typeof connection.sendMessagePromise !== 'function') return;
    let alive = true;
    const browse = (item?: MediaItem) =>
      connection.sendMessagePromise<BrowseResult>({
        type: 'media_player/browse_media',
        entity_id: entityId,
        ...(item && { media_content_id: item.media_content_id, media_content_type: item.media_content_type }),
      });
    (async () => {
      try {
        let children = (await browse()).children ?? [];
        if (!children.some(c => c.can_play)) {
          const first = children.find(c => c.can_expand);
          children = first ? ((await browse(first)).children ?? []) : [];
        }
        if (alive) setItems(children.filter(c => c.can_play).slice(0, MAX_ITEMS));
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [connection, entityId, enabled]);

  return items;
}

import { describe, it, expect } from 'vitest';
import type { Connection } from 'home-assistant-js-websocket';
import { resolveMediaSourceId } from './useResolvedMediaUrls';

const ALBUM = 'media-source://immich/entry|albums|album';

/** Album Immich tel que HA le renvoie : images non « jouables », vidéos jouables, et un dossier. */
const connection = {
  sendMessagePromise: async (msg: { type: string; media_content_id: string }) => {
    if (msg.type === 'media_source/browse_media') {
      return {
        children: [
          { media_content_id: `${ALBUM}|a|a.jpg|image/jpeg`, media_class: 'image', can_play: false },
          { media_content_id: `${ALBUM}|b|b.mp4|video/mp4`, media_class: 'video', can_play: true },
          { media_content_id: `${ALBUM}|sub`, media_class: 'directory', can_play: false },
        ],
      };
    }
    if (msg.media_content_id === ALBUM) throw new Error('Unresolvable');
    return { url: `/immich/${msg.media_content_id.split('|')[3]}` };
  },
} as unknown as Connection;

describe('resolveMediaSourceId', () => {
  it("garde les images et les vidéos d'un album Immich", async () => {
    // Le préfixe dépend de VITE_HA_URL : seul le chemin compte ici.
    const urls = await resolveMediaSourceId(connection, ALBUM);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/\/immich\/a$/);
    expect(urls[1]).toMatch(/\/immich\/b$/);
  });
});

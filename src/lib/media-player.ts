/**
 * Logique pure du lecteur média : capacités, progression, temps, répétition.
 * Testée seule ; la fiche et la card n'en gardent que le rendu.
 */

/** Drapeaux de `supported_features` (MediaPlayerEntityFeature côté HA). */
export const MEDIA_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  PLAY_MEDIA: 512,
  SELECT_SOURCE: 2048,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
} as const;

export type MediaFeature = keyof typeof MEDIA_FEATURE;

/**
 * Le lecteur sait-il le faire ? Sans `supported_features` (mock, intégration
 * qui ne le publie pas), on suppose que oui : mieux vaut un bouton sans effet
 * qu'une commande introuvable.
 */
export function supportsMedia(features: unknown, feature: MediaFeature): boolean {
  if (typeof features !== 'number') return true;
  return (features & MEDIA_FEATURE[feature]) !== 0;
}

export type RepeatMode = 'off' | 'all' | 'one';

/** Ordre du bouton répétition : désactivée → tout → un seul titre → désactivée. */
export function nextRepeat(mode: unknown): RepeatMode {
  return mode === 'off' || mode == null ? 'all' : mode === 'all' ? 'one' : 'off';
}

/**
 * Position de lecture, en secondes, à l'instant `now` (ms).
 *
 * HA ne republie `media_position` qu'aux changements d'état (pause, saut…), en
 * l'horodatant par `media_position_updated_at`. Pendant la lecture, on
 * interpole : position + temps écoulé depuis l'horodatage, bornée à la durée.
 */
export function interpolatePosition(
  attrs: { media_position?: unknown; media_position_updated_at?: unknown; media_duration?: unknown },
  playing: boolean,
  now: number
): number {
  const position = typeof attrs.media_position === 'number' ? attrs.media_position : 0;
  const duration = typeof attrs.media_duration === 'number' ? attrs.media_duration : 0;
  let current = position;
  if (playing && typeof attrs.media_position_updated_at === 'string') {
    const updated = Date.parse(attrs.media_position_updated_at);
    if (!Number.isNaN(updated)) current = position + Math.max(0, now - updated) / 1000;
  }
  current = Math.max(0, current);
  return duration > 0 ? Math.min(current, duration) : current;
}

/** `75` → `1:15`, `3725` → `1:02:05`. */
export function formatMediaTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** États où le lecteur n'a rien à montrer. */
export function isMediaOff(state: string | undefined): boolean {
  return state === 'off' || state === 'unavailable' || state === 'standby' || state === 'unknown';
}

type PlayerEntity = { state: string; attributes?: Record<string, unknown> };

/** De la musique, pas une vidéo : un lecteur Music Assistant, ou un contenu `music`. */
function isMusic(e: PlayerEntity): boolean {
  return typeof e.attributes?.mass_player_type === 'string' || e.attributes?.media_content_type === 'music';
}

/**
 * Le lecteur que l'écran de veille montre : celui qui joue de la musique (un
 * lecteur Music Assistant d'abord). `keep`, celui déjà montré, reste tant qu'il
 * est en pause — sinon la pause ferait disparaître le bouton qui relance.
 */
export function pickPlayingMusic(entities: Record<string, PlayerEntity>, keep?: string): string | undefined {
  const players = Object.entries(entities).filter(
    ([id, e]) => id.startsWith('media_player.') && typeof e.attributes?.media_title === 'string' && isMusic(e)
  );
  const playing = players.filter(([, e]) => e.state === 'playing');
  const mass = playing.find(([, e]) => typeof e.attributes?.mass_player_type === 'string');
  const current = mass ?? playing[0];
  if (current) return current[0];
  return keep && players.some(([id, e]) => id === keep && e.state === 'paused') ? keep : undefined;
}

/**
 * Logique pure de Music Assistant (MA), vu depuis Home Assistant.
 *
 * Tout passe par le WebSocket de HA : les services `music_assistant.*` pour la
 * bibliothèque et la recherche, `media_player/browse_media` pour le contenu
 * d'un album, d'une playlist ou d'un artiste. Aucun lien direct vers le
 * serveur MA, donc aucun second jeton.
 */

export type MassMediaType = 'artist' | 'album' | 'playlist' | 'track' | 'radio';

/** Ordres de `music_assistant.get_library` repris par la bibliothèque. */
export type MassOrder = 'last_played_desc' | 'sort_name' | 'timestamp_added_desc';

/** `enqueue` de `music_assistant.play_media`. */
export type MassEnqueue = 'play' | 'next' | 'add';

interface MassRef {
  uri: string;
  name: string;
  image?: string | null;
}

/** Un élément de la bibliothèque, tel que le renvoient `get_library` et `search`. */
export interface MassItem extends MassRef {
  media_type: MassMediaType;
  favorite?: boolean;
  version?: string;
  artists?: MassRef[];
  album?: MassRef | null;
}

/** Réponse de `music_assistant.get_library`. */
export interface MassLibraryResponse {
  items: MassItem[];
}

/** Réponse de `music_assistant.search` : une liste par type. */
export interface MassSearchResponse {
  artists: MassItem[];
  albums: MassItem[];
  tracks: MassItem[];
  playlists: MassItem[];
  radio: MassItem[];
}

/** Un enfant de `browse_media` (titre d'un album, album d'un artiste…). */
export interface BrowseChild {
  title: string;
  media_content_id: string;
  media_content_type: string;
  media_class: string;
  thumbnail?: string | null;
  can_play: boolean;
}

export interface BrowseNode {
  title: string;
  children?: BrowseChild[];
}

/**
 * Lecteur Music Assistant ? MA publie `mass_player_type` (`player`, `group`)
 * sur ses propres lecteurs ; les entités Cast ou Samsung des mêmes enceintes
 * ne l'ont pas. C'est ce qui écarte les doublons.
 */
export function isMassPlayer(entity: { attributes?: Record<string, unknown> } | null | undefined): boolean {
  return typeof entity?.attributes?.mass_player_type === 'string';
}

/** Les artistes d'un élément, en une ligne. */
export function artistLine(item: Pick<MassItem, 'artists'>): string {
  return (item.artists ?? []).map(a => a.name).join(', ');
}

/** Initiales d'un artiste sans photo : « Clara Voss » → « CV », « Sable » → « S ». */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * `browse_media` nomme un titre « Artiste - Titre ». On sépare au premier
 * « - » : l'artiste connu (celui de l'album) est retiré en priorité, sinon on
 * coupe à la première occurrence.
 *
 * ponytail: un nom d'artiste qui contient lui-même « - » est mal coupé dans une
 * playlist ; passer par `get_library` sur l'URI si ça gêne.
 */
export function splitTrackTitle(title: string, knownArtist?: string): { artist: string; title: string } {
  if (knownArtist && title.startsWith(`${knownArtist} - `)) {
    return { artist: knownArtist, title: title.slice(knownArtist.length + 3) };
  }
  const i = title.indexOf(' - ');
  return i > 0 ? { artist: title.slice(0, i), title: title.slice(i + 3) } : { artist: '', title };
}

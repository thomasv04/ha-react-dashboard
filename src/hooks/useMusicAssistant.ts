import { useCallback, useEffect, useState } from 'react';
import { useHass } from '@hakit/core';
import { callHAService } from '@/lib/ha-service';
import { apiFetch } from '@/lib/api-base';
import { pickMassPlayer, rememberedPlayer } from '@/lib/music-assistant';
import type { BrowseNode, MassEnqueue, MassLibraryResponse, MassMediaType, MassOrder, MassSearchResponse } from '@/lib/music-assistant';

export interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Envoie un message WebSocket à HA et en garde la réponse. `null` = rien à
 * demander. Le message est comparé par son contenu : le recréer à chaque rendu
 * ne relance pas l'appel.
 */
function useWsQuery<T>(message: Record<string, unknown> | null): QueryResult<T> {
  const connection = useHass(s => s.connection);
  const [state, setState] = useState<Omit<QueryResult<T>, 'refresh'>>({ data: null, loading: false, error: null });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);
  const key = message ? JSON.stringify(message) : '';

  useEffect(() => {
    if (!key || !connection || typeof connection.sendMessagePromise !== 'function') {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let alive = true;
    setState(s => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const data = await connection.sendMessagePromise<T>(JSON.parse(key));
        if (alive) setState({ data, loading: false, error: null });
      } catch (err) {
        // HA rejette avec un objet `{ code, message }`, pas une Error.
        const msg = (err as { message?: string })?.message ?? 'error';
        if (alive) setState({ data: null, loading: false, error: msg });
      }
    })();
    return () => {
      alive = false;
    };
  }, [connection, key, nonce]);

  return { ...state, refresh };
}

/** Un service MA qui répond : HA enveloppe la réponse dans `response`. */
function serviceMessage(service: string, data: Record<string, unknown>) {
  return { type: 'call_service', domain: 'music_assistant', service, service_data: data, return_response: true };
}

function unwrap<T>(q: QueryResult<{ response?: T }>): QueryResult<T> {
  return { ...q, data: q.data?.response ?? null };
}

/**
 * L'instance MA d'un lecteur : les services `music_assistant.*` la demandent
 * (`config_entry_id`), et c'est le registre d'entités qui la donne.
 */
export function useMassEntryId(entityId: string | undefined): { entryId: string | null; error: string | null } {
  const q = useWsQuery<{ config_entry_id?: string | null }>(entityId ? { type: 'config/entity_registry/get', entity_id: entityId } : null);
  return { entryId: q.data?.config_entry_id ?? null, error: q.error };
}

export interface LibraryQuery {
  mediaType: MassMediaType;
  orderBy?: MassOrder;
  favorite?: boolean;
  /** Filtre sur le nom, dans ce type seulement. */
  search?: string;
  limit?: number;
}

/** Une page de la bibliothèque (`music_assistant.get_library`). */
export function useMassLibrary(entryId: string | null, query: LibraryQuery): QueryResult<MassLibraryResponse> {
  const { mediaType, orderBy = 'last_played_desc', favorite, search, limit = 100 } = query;
  return unwrap(
    useWsQuery<{ response?: MassLibraryResponse }>(
      entryId
        ? serviceMessage('get_library', {
            config_entry_id: entryId,
            media_type: mediaType,
            order_by: orderBy,
            limit,
            ...(favorite && { favorite: true }),
            ...(search && { search }),
          })
        : null
    )
  );
}

/** Recherche dans la bibliothèque, tous types confondus. Vide = aucun appel. */
export function useMassSearch(entryId: string | null, text: string, limit = 20): QueryResult<MassSearchResponse> {
  const name = text.trim();
  return unwrap(
    useWsQuery<{ response?: MassSearchResponse }>(
      entryId && name ? serviceMessage('search', { config_entry_id: entryId, name, limit, library_only: true }) : null
    )
  );
}

/**
 * Le contenu d'un album, d'une playlist ou d'un artiste. MA n'a pas de service
 * pour ça : on passe par la navigation média du lecteur, qui accepte l'URI MA
 * avec le type `music_assistant`.
 */
export function useMassBrowse(entityId: string | undefined, uri: string | null): QueryResult<BrowseNode> {
  return useWsQuery<BrowseNode>(
    entityId && uri
      ? { type: 'media_player/browse_media', entity_id: entityId, media_content_id: uri, media_content_type: 'music_assistant' }
      : null
  );
}

/**
 * L'enceinte d'une card en mode automatique : celle de Music Assistant qui
 * joue, sinon la dernière choisie sur l'appareil. `false` = rien à résoudre.
 */
export function useAutoMassPlayer(enabled: boolean): string | undefined {
  return useHass(s => (enabled ? pickMassPlayer(s.entities, rememberedPlayer()) : undefined));
}

/** Lance un élément MA sur un lecteur — tout de suite, ensuite, ou en fin de file. */
export function massPlay(
  helpers: { callService: unknown },
  entityId: string,
  item: { uri: string; media_type?: MassMediaType },
  enqueue: MassEnqueue = 'play'
) {
  callHAService(
    helpers,
    'music_assistant',
    'play_media',
    { entity_id: entityId },
    { media_id: item.uri, ...(item.media_type && { media_type: item.media_type }), enqueue }
  );
}

/** Un titre de la file complète, tel que l'add-on le rend (`/api/music/queue`). */
export interface FullQueueItem {
  queue_item_id: string;
  name: string;
  artists: string[];
  duration: number | null;
  image: string | null;
}

/**
 * La file d'attente complète, par l'add-on du dashboard qui interroge Music
 * Assistant (HA n'en donne que le titre en cours et le suivant). `null` tant
 * que rien n'est arrivé, ou quand l'add-on n'a pas de jeton MA : l'écran garde
 * alors la file réduite. `revision` relance la lecture (titre suivant, ajout).
 */
export function useMassQueueItems(queueId: string | undefined, revision: string) {
  const [items, setItems] = useState<FullQueueItem[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    if (!queueId) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/music/queue/${encodeURIComponent(queueId)}?limit=300`);
        const data = res.ok ? await res.json() : null;
        if (alive) setItems(Array.isArray(data) ? data : null);
      } catch {
        if (alive) setItems(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [queueId, revision, nonce]);

  return { items, refresh, setItems };
}

/** Déplace, retire ou lance un titre de la file complète. */
export async function massQueueCommand(
  queueId: string,
  action: 'move' | 'delete' | 'play',
  body: { queue_item_id?: string; pos_shift?: number; index?: number }
): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/music/queue/${encodeURIComponent(queueId)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

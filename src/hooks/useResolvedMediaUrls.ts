import { useState, useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import type { Connection } from 'home-assistant-js-websocket';

interface BrowseMediaItem {
  media_content_id: string;
  media_class: string;
  can_play: boolean;
  can_expand: boolean;
  children?: BrowseMediaItem[] | null;
}

/**
 * Derives the HA HTTP base URL (e.g. "http://homeassistant.local:8123") from
 * the WebSocket URL stored on the connection object.
 * Falls back to VITE_HA_URL env var, then empty string.
 */
function haBaseUrl(connection: Connection): string {
  const wsUrl = (connection as unknown as { socket?: { url?: string } }).socket?.url;
  if (wsUrl) {
    try {
      // wss://host:port/api/websocket  ->  https://host:port
      // ws://host:port/api/websocket   ->  http://host:port
      const u = new URL(wsUrl);
      const protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
      return `${protocol}//${u.host}`;
    } catch {
      // fall through to env var
    }
  }
  return ((import.meta.env.VITE_HA_URL as string | undefined) ?? '').replace(/\/$/, '');
}

/**
 * Try to resolve a single media-source:// ID into an HTTP URL.
 * Returns null if the ID is a folder/album (not directly playable).
 */
async function tryResolve(connection: Connection, id: string, baseUrl: string): Promise<string | null> {
  try {
    const data = await connection.sendMessagePromise<{ url: string }>({
      type: 'media_source/resolve_media',
      media_content_id: id,
    });
    const url = data.url;
    if (!url) return null;
    // HA can return a relative URL like /synology_dsm/.../photo.jpg?authSig=...
    return url.startsWith('/') ? `${baseUrl}${url}` : url;
  } catch {
    return null;
  }
}

/**
 * Resolves a media-source:// ID to one or more HTTP URLs.
 *  - If ID is a file: returns [resolvedUrl]
 *  - If ID is an album/folder: browses children, resolves each playable child
 *  - Falls back to [] on any error
 */
async function resolveMediaSourceId(connection: Connection, id: string): Promise<string[]> {
  const baseUrl = haBaseUrl(connection);

  // First try resolving directly (file-level ID)
  const direct = await tryResolve(connection, id, baseUrl);
  if (direct) return [direct];

  // Failed -> likely an album. Browse its children.
  try {
    const browse = await connection.sendMessagePromise<BrowseMediaItem>({
      type: 'media_source/browse_media',
      media_content_id: id,
    });

    const playable = browse.children?.filter(c => c.can_play) ?? [];
    if (!playable.length) {
      console.warn(`[WallPanel] No playable children found when browsing ${id}`);
      return [];
    }

    const urls = await Promise.all(playable.map(c => tryResolve(connection, c.media_content_id, baseUrl)));
    return urls.filter((u): u is string => !!u);
  } catch (err) {
    console.warn(`[WallPanel] Could not resolve or browse ${id}:`, err);
    return [];
  }
}

/**
 * Resolves a list of image URLs, transparently converting any
 * `media-source://` references to real HTTP URLs.
 *
 * Album URIs (e.g. media-source://synology_dsm/XXXX/1) are expanded
 * into all their child file URLs automatically.
 *
 * Regular HTTP/HTTPS URLs pass through unchanged.
 * While resolution is in progress the array is empty (caller shows fallback).
 */
export function useResolvedMediaUrls(urls: string[]): string[] {
  const connection = useHass(s => s.connection) as Connection | undefined;
  const [resolved, setResolved] = useState<string[]>([]);
  const urlsKey = urls.join('|');
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!connection) return;
    if (urlsKey === prevKeyRef.current) return;
    prevKeyRef.current = urlsKey;

    if (!urls.length) {
      setResolved([]);
      return;
    }

    const resolveAll = async () => {
      const groups = await Promise.all(
        urls.map(url => (url.startsWith('media-source://') ? resolveMediaSourceId(connection, url) : Promise.resolve([url])))
      );
      setResolved(groups.flat());
    };

    resolveAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey, connection]);

  return resolved;
}

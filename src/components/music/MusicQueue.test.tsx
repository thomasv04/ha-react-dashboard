import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
const hassState = { helpers: { callService }, connection: { sendMessagePromise } };
let entity: { state: string; attributes: Record<string, unknown> } | null;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));
// L'add-on du dashboard : sans réponse, la file reste réduite (`not_configured`).
const apiFetch = vi.fn(
  async (_path: string, _init?: RequestInit) => new Response(JSON.stringify({ error: 'not_configured' }), { status: 503 })
);
vi.mock('@/lib/api-base', () => ({ apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init) }));

import { MusicQueue } from './MusicQueue';

const track = (name: string, artist: string) => ({
  name: `${artist} - ${name}`,
  duration: 252,
  media_item: { media_type: 'track', uri: `library://track/${name}`, name, artists: [{ uri: 'a', name: artist }] },
});

const answer = (queue: Record<string, unknown>) => sendMessagePromise.mockResolvedValue({ response: { 'media_player.salon_2': queue } });

describe('MusicQueue', () => {
  beforeEach(() => {
    callService.mockClear();
    sendMessagePromise.mockReset();
    apiFetch.mockClear();
    entity = { state: 'playing', attributes: { friendly_name: 'Salon', media_title: 'Believer', media_duration: 204, media_position: 30 } };
  });

  it('montre le titre en cours, le suivant, et ce qui reste après', async () => {
    answer({
      items: 11,
      current_index: 2,
      current_item: track('Believer', 'Imagine Dragons'),
      next_item: track('Thunder', 'Imagine Dragons'),
    });
    render(<MusicQueue player='media_player.salon_2' />);

    expect(await screen.findByText('Believer')).toBeInTheDocument();
    expect(screen.getByText('Thunder')).toBeInTheDocument();
    expect(screen.getByText('4:12')).toBeInTheDocument();
    // 11 titres, le 3e joue : 8 à suivre, dont 7 après le suivant.
    expect(screen.getByText('widgets.music.trackCount_other')).toBeInTheDocument();
    expect(screen.getByText('widgets.music.queueMore_other')).toBeInTheDocument();
    expect(sendMessagePromise.mock.calls[0][0]).toMatchObject({
      domain: 'music_assistant',
      service: 'get_queue',
      target: { entity_id: ['media_player.salon_2'] },
      return_response: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.clearQueue' }));
    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'media_player', service: 'clear_playlist', target: { entity_id: 'media_player.salon_2' } })
    );
  });

  it('dit quand la file est vide', async () => {
    entity = { state: 'idle', attributes: { friendly_name: 'Salon' } };
    answer({ items: 0, current_index: null, current_item: null, next_item: null });
    render(<MusicQueue player='media_player.salon_2' />);
    expect(await screen.findByText('widgets.music.queueEmpty')).toBeInTheDocument();
  });

  it('montre toute la file quand l’add-on joint Music Assistant, et la pilote', async () => {
    answer({ queue_id: 'q1', items: 4, current_index: 0, current_item: track('Believer', 'Imagine Dragons'), next_item: null });
    const full = [
      { queue_item_id: 'a', name: 'Believer', artists: ['Imagine Dragons'], duration: 204, image: null },
      { queue_item_id: 'b', name: 'Thunder', artists: ['Imagine Dragons'], duration: 187, image: null },
      { queue_item_id: 'c', name: 'Radioactive', artists: ['Imagine Dragons'], duration: 186, image: null },
      { queue_item_id: 'd', name: 'Demons', artists: ['Imagine Dragons'], duration: 177, image: null },
    ];
    apiFetch.mockImplementation(async (path: string) =>
      path.includes('?') ? new Response(JSON.stringify(full)) : new Response(JSON.stringify({ ok: true }))
    );
    render(<MusicQueue player='media_player.salon_2' />);

    // Les trois titres après celui en cours, et leur durée totale (9 min).
    expect(await screen.findByRole('button', { name: /^Radioactive/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Demons/ })).toBeInTheDocument();
    expect(screen.queryByText('widgets.music.queueMore_other')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/api/music/queue/q1?limit=300', undefined);

    fireEvent.click(screen.getByRole('button', { name: /^Radioactive/ }));
    // MA compte depuis le début de la file : Radioactive est le 3e titre (index 2).
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/music/queue/q1/play', expect.objectContaining({ body: JSON.stringify({ index: 2 }) }))
    );

    // Au clavier, le premier à suivre (Thunder) descend d'une place.
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'widgets.music.reorder' })[0], { key: 'ArrowDown' });
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/music/queue/q1/move',
        expect.objectContaining({ body: JSON.stringify({ queue_item_id: 'b', pos_shift: 1 }) })
      )
    );

    // Retiré : la ligne disparaît tout de suite, sans attendre la relecture.
    fireEvent.click(screen.getAllByRole('button', { name: 'widgets.music.removeFromQueue' }).at(-1)!);
    expect(screen.queryByRole('button', { name: /^Demons/ })).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/music/queue/q1/delete',
      expect.objectContaining({ body: JSON.stringify({ queue_item_id: 'd' }) })
    );
  });
});

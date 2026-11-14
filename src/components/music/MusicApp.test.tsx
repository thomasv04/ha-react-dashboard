import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
// Référence stable, comme le vrai store.
const hassState = { helpers: { callService }, connection: { sendMessagePromise } };

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));

vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => null }));

import MusicApp from './MusicApp';

const LOOM = {
  media_type: 'album',
  uri: 'library://album/3',
  name: 'LOOM',
  favorite: true,
  artists: [{ uri: 'a', name: 'Imagine Dragons' }],
};

/** Répond comme HA : le registre, puis la bibliothèque selon le type demandé. */
function fakeHa(items: Record<string, unknown[]>) {
  sendMessagePromise.mockImplementation(async (msg: { type: string; service_data?: { media_type: string } }) => {
    if (msg.type === 'config/entity_registry/get') return { config_entry_id: 'entry1' };
    return { response: { items: items[msg.service_data!.media_type] ?? [] } };
  });
}

const libraryCalls = () => sendMessagePromise.mock.calls.map(c => c[0]).filter(m => m.service === 'get_library');

describe('MusicApp', () => {
  beforeEach(() => {
    callService.mockClear();
    sendMessagePromise.mockReset();
  });

  it("ouvre la fiche d'un album, puis revient à la bibliothèque", async () => {
    fakeHa({ album: [LOOM] });
    render(<MusicApp entityId='media_player.salon_2' widgetId='w' />);

    // La rangée « Écoutés récemment » et la grille montrent le même album.
    const covers = await screen.findAllByRole('button', { name: /LOOM/ });
    expect(libraryCalls()[0].service_data.config_entry_id).toBe('entry1');

    fireEvent.click(covers[1]);
    expect(await screen.findByTestId('music-detail')).toBeInTheDocument();
    expect(callService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /widgets\.music\.back/ }));
    expect(screen.queryByTestId('music-detail')).not.toBeInTheDocument();
  });

  it("lance un titre d'un appui", async () => {
    fakeHa({ track: [{ media_type: 'track', uri: 'library://track/148', name: 'We Are Young', artists: [] }] });
    render(<MusicApp entityId='media_player.salon_2' widgetId='w' />);
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.tabs.track' }));

    const rows = await screen.findAllByRole('button', { name: /We Are Young/ });
    fireEvent.click(rows.at(-1)!);
    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'music_assistant',
        service: 'play_media',
        target: { entity_id: 'media_player.salon_2' },
        serviceData: { media_id: 'library://track/148', media_type: 'track', enqueue: 'play' },
      })
    );
  });

  it('change de type, de tri et filtre les favoris', async () => {
    fakeHa({ album: [LOOM] });
    render(<MusicApp entityId='media_player.salon_2' widgetId='w' />);
    await screen.findAllByRole('button', { name: /LOOM/ });

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.tabs.artist' }));
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.order.sort_name' }));
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.favorites' }));

    await waitFor(() =>
      expect(libraryCalls().at(-1).service_data).toMatchObject({ media_type: 'artist', order_by: 'sort_name', favorite: true })
    );
    expect(await screen.findByText('widgets.music.noFavorites')).toBeInTheDocument();
  });

  it('dit quand la bibliothèque est vide, et propose de la relire', async () => {
    fakeHa({});
    render(<MusicApp entityId='media_player.salon_2' widgetId='w' />);
    expect(await screen.findByText('widgets.music.empty.album')).toBeInTheDocument();

    const before = libraryCalls().length;
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.refresh' }));
    await waitFor(() => expect(libraryCalls().length).toBeGreaterThan(before));
  });

  it('dit quand Music Assistant ne répond pas', async () => {
    sendMessagePromise.mockRejectedValue({ code: 'not_found', message: 'Entity not found' });
    render(<MusicApp entityId='media_player.cast' widgetId='w' />);
    expect(await screen.findByText('widgets.music.error')).toBeInTheDocument();
  });
});

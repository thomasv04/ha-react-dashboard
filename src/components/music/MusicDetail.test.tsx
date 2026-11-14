import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
const hassState = { helpers: { callService }, connection: { sendMessagePromise } };
let player: { state: string; attributes: Record<string, unknown> } | null = null;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => player }));

import { MusicDetail } from './MusicDetail';
import type { MassItem } from '@/lib/music-assistant';

const ALBUM: MassItem = { media_type: 'album', uri: 'library://album/28', name: 'Some Nights', artists: [{ uri: 'a', name: 'fun.' }] };
const ARTIST: MassItem = { media_type: 'artist', uri: 'library://artist/11', name: 'Imagine Dragons' };
const track = (title: string, id: string) => ({
  title,
  media_content_id: id,
  media_content_type: 'music',
  media_class: 'track',
  can_play: true,
});
const calls = () => callService.mock.calls.map(c => c[0]);

describe('MusicDetail', () => {
  beforeEach(() => {
    callService.mockClear();
    player = null;
  });

  it("liste les titres d'un album sans répéter l'artiste, et marque celui qui joue", async () => {
    player = { state: 'playing', attributes: { media_title: 'We Are Young' } };
    sendMessagePromise.mockResolvedValue({
      title: 'Some Nights',
      children: [track('fun. - Some Nights', 't1'), track('fun. - We Are Young', 'library://track/148')],
    });
    render(<MusicDetail entityId='media_player.salon_2' item={ALBUM} onOpen={vi.fn()} />);

    const current = await screen.findByRole('button', { name: /We Are Young/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /^1\s*Some Nights$/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('widgets.music.trackCount_other')).toBeInTheDocument();

    fireEvent.click(current);
    expect(calls().at(-1)).toMatchObject({
      service: 'play_media',
      serviceData: { media_id: 'library://track/148', media_type: 'track', enqueue: 'play' },
    });
  });

  it("lance l'album en aléatoire, ou l'ajoute à la file", async () => {
    sendMessagePromise.mockResolvedValue({ title: 'Some Nights', children: [] });
    render(<MusicDetail entityId='media_player.salon_2' item={ALBUM} onOpen={vi.fn()} />);
    await screen.findByText('widgets.music.noTracks');

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.shuffle' }));
    // L'aléatoire d'abord : MA tire la file au moment où elle se remplit.
    expect(calls().map(c => `${c.domain}.${c.service}`)).toEqual(['media_player.shuffle_set', 'music_assistant.play_media']);

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.addToQueue' }));
    expect(calls().at(-1).serviceData).toMatchObject({ media_id: 'library://album/28', enqueue: 'add' });
  });

  it("ouvre un album depuis la fiche d'un artiste", async () => {
    sendMessagePromise.mockResolvedValue({
      title: 'Imagine Dragons',
      children: [{ ...track('Imagine Dragons - Origins', 'library://album/10'), media_class: 'album' }],
    });
    const onOpen = vi.fn();
    render(<MusicDetail entityId='media_player.salon_2' item={ARTIST} onOpen={onOpen} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Origins' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ uri: 'library://album/10', name: 'Origins', media_type: 'album' }));
    // Pas d'aléatoire ni de file pour un artiste : seulement « Lire ».
    expect(screen.queryByRole('button', { name: 'widgets.music.shuffle' })).not.toBeInTheDocument();
  });
});

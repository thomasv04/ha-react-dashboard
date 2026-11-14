import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
const hassState = { helpers: { callService }, connection: { sendMessagePromise } };
let entity: { state: string; attributes: Record<string, unknown> } | null;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));

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
});

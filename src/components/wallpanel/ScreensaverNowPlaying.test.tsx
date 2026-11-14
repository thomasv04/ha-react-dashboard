import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const hassState: {
  helpers: unknown;
  connection: unknown;
  entities: Record<string, { state: string; attributes: Record<string, unknown> }>;
} = {
  helpers: { callService },
  connection: { socket: { url: 'ws://ha.local:8123/api/websocket' } },
  entities: {},
};

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));

import { ScreensaverNowPlaying } from './ScreensaverNowPlaying';

const salon = (state: string) => ({
  state,
  attributes: { mass_player_type: 'player', media_title: 'Believer', media_artist: 'Imagine Dragons', volume_level: 0.4 },
});
const calls = () => callService.mock.calls.map(c => c[0]);

describe('ScreensaverNowPlaying', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    callService.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('montre ce qui joue et le pilote sans quitter la veille', async () => {
    hassState.entities = { 'media_player.salon_2': salon('playing') };
    const onOpen = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ScreensaverNowPlaying onOpen={onOpen} />
      </div>
    );
    expect(screen.getByText('Believer')).toBeInTheDocument();
    expect(screen.getByText('Imagine Dragons')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'widgets.media_player.pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'widgets.media_player.next' }));
    expect(calls().map(c => c.service)).toEqual(['media_play_pause', 'media_next_track']);
    // Un appui sur la carte ne remonte pas à l'écran de veille, qui se fermerait.
    expect(parentClick).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('slider', { name: 'widgets.media_player.volume' }), { target: { value: '60' } });
    await act(async () => void vi.advanceTimersByTime(150));
    expect(calls().at(-1)).toMatchObject({ service: 'volume_set', serviceData: { volume_level: 0.6 } });

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.openPlayer' }));
    expect(onOpen).toHaveBeenCalledWith('media_player.salon_2');
  });

  it('reste en pause pour qu’on relance', () => {
    hassState.entities = { 'media_player.salon_2': salon('playing') };
    const { rerender } = render(<ScreensaverNowPlaying onOpen={vi.fn()} />);
    hassState.entities = { 'media_player.salon_2': salon('paused') };
    rerender(<ScreensaverNowPlaying onOpen={vi.fn()} />);
    // La disparition à l'arrêt : voir pickPlayingMusic (la sortie animée ne se joue pas sous jsdom).
    expect(screen.getByRole('button', { name: 'widgets.media_player.play' })).toBeInTheDocument();
  });

  it('ne montre rien sans musique', () => {
    hassState.entities = { 'media_player.tv': { state: 'playing', attributes: { media_title: 'JT', media_content_type: 'video' } } };
    render(<ScreensaverNowPlaying onOpen={vi.fn()} />);
    expect(screen.queryByTestId('screensaver-now-playing')).not.toBeInTheDocument();
  });
});

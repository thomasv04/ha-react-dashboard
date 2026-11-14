import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mass = (name: string, state: string, title?: string) => ({
  state,
  attributes: { friendly_name: name, mass_player_type: 'player', ...(title && { media_title: title }) },
});
const hassState = {
  entities: {
    'media_player.salon_2': mass('Salon', 'playing', 'Believer'),
    'media_player.chambre': mass('Chambre', 'idle'),
    'media_player.terrasse': mass('Terrasse', 'unavailable'),
    // La même enceinte vue par Cast : jamais proposée.
    'media_player.salon_cast': { state: 'idle', attributes: { friendly_name: 'Salon Cast' } },
  },
};

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));

import { MusicActions } from './MusicActions';
import type { MassItem } from '@/lib/music-assistant';

const ALBUM: MassItem = { media_type: 'album', uri: 'library://album/3', name: 'LOOM', artists: [{ uri: 'a', name: 'Imagine Dragons' }] };

const setup = () => {
  const onPlay = vi.fn();
  const onPlayerChange = vi.fn();
  const onClose = vi.fn();
  render(
    <MusicActions
      item={ALBUM}
      player='media_player.salon_2'
      onPlay={onPlay}
      onPlayerChange={onPlayerChange}
      onGroup={vi.fn()}
      onClose={onClose}
    />
  );
  return { onPlay, onPlayerChange, onClose };
};

describe('MusicActions', () => {
  it('lance ensuite ou en fin de file, sur l’enceinte de l’appli, puis se ferme', () => {
    const { onPlay, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.playNext' }));
    expect(onPlay).toHaveBeenLastCalledWith(ALBUM, 'next', 'media_player.salon_2');
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.addToQueue' }));
    expect(onPlay).toHaveBeenLastCalledWith(ALBUM, 'add', 'media_player.salon_2');
  });

  it('lit sur une autre enceinte MA, qui devient celle de l’appli', () => {
    const { onPlay, onPlayerChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /widgets\.music\.playOn/ }));

    expect(screen.getByRole('button', { name: /Salon/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /Terrasse/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Salon Cast/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Chambre/ }));
    expect(onPlayerChange).toHaveBeenCalledWith('media_player.chambre');
    expect(onPlay).toHaveBeenCalledWith(ALBUM, 'play', 'media_player.chambre');
  });
});

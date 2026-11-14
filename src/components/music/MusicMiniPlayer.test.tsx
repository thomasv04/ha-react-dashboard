import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const openMoreInfo = vi.fn();
const hassState = { helpers: { callService }, connection: { socket: { url: 'ws://ha.local:8123/api/websocket' } } };
let entity: { state: string; attributes: Record<string, unknown> } | null;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));
vi.mock('@/context/MoreInfoContext', () => ({ useMoreInfoOptional: () => ({ openMoreInfo }) }));

import { MusicMiniPlayer } from './MusicMiniPlayer';

const playing = (extra: Record<string, unknown> = {}) => ({
  state: 'playing',
  attributes: {
    friendly_name: 'Salon',
    media_title: 'Believer',
    media_artist: 'Imagine Dragons',
    media_duration: 200,
    media_position: 50,
    media_position_updated_at: new Date().toISOString(),
    ...extra,
  },
});

describe('MusicMiniPlayer', () => {
  beforeEach(() => {
    callService.mockClear();
    openMoreInfo.mockClear();
  });

  it('montre le titre, l’enceinte et la progression ; un appui ouvre le lecteur', () => {
    entity = playing();
    render(<MusicMiniPlayer entityId='media_player.salon_2' />);
    expect(screen.getByText('Believer')).toBeInTheDocument();
    expect(screen.getByText('Imagine Dragons')).toBeInTheDocument();
    expect(screen.getByText('Salon')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.openPlayer' }));
    expect(openMoreInfo).toHaveBeenCalledWith('media_player.salon_2', 'media_player', 'media_player.salon_2');

    fireEvent.click(screen.getByRole('button', { name: 'widgets.media_player.pause' }));
    expect(callService).toHaveBeenLastCalledWith(expect.objectContaining({ domain: 'media_player', service: 'media_play_pause' }));
  });

  it('une radio est « en direct » : pas de progression, pas de titre suivant', () => {
    entity = playing({ media_duration: undefined });
    render(<MusicMiniPlayer entityId='media_player.salon_2' />);
    expect(screen.getByText('widgets.music.live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'widgets.media_player.next' })).toBeDisabled();
  });

  it('nomme un groupe par son enceinte et le nombre des autres', () => {
    entity = playing({ group_members: ['media_player.salon_2', 'media_player.cuisine', 'media_player.chambre'] });
    render(<MusicMiniPlayer entityId='media_player.salon_2' />);
    expect(screen.getByText('Salon + 2')).toBeInTheDocument();
  });

  it('garde le nom d’un groupe défini dans Music Assistant', () => {
    entity = playing({
      friendly_name: 'Maison',
      mass_player_type: 'group',
      group_members: ['media_player.salon_2', 'media_player.cuisine'],
    });
    render(<MusicMiniPlayer entityId='media_player.maison_2' />);
    expect(screen.getByText('Maison')).toBeInTheDocument();
  });

  it('disparaît quand rien n’est chargé', () => {
    entity = { state: 'idle', attributes: { friendly_name: 'Salon' } };
    const { container } = render(<MusicMiniPlayer entityId='media_player.salon_2' />);
    expect(container).toBeEmptyDOMElement();
  });
});

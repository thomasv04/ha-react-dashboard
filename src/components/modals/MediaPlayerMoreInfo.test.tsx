import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const callService = vi.fn();
let entity: { state: string; attributes: Record<string, unknown> } | null;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => {
    const state = {
      helpers: { callService },
      connection: { socket: { url: 'wss://ha.example.org/api/websocket' } },
    };
    return selector ? selector(state) : state;
  },
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => undefined }) }));
vi.mock('@/hooks/useSoundFeedback', () => ({ useSoundFeedback: () => vi.fn() }));

import MediaPlayerMoreInfo from './MediaPlayerMoreInfo';

const render_ = () => render(<MediaPlayerMoreInfo entityId='media_player.salon' widgetId='w1' />);
const lastCall = () => callService.mock.calls.at(-1)?.[0];

beforeEach(() => {
  callService.mockClear();
  entity = {
    state: 'playing',
    attributes: {
      friendly_name: 'Salon',
      media_title: 'September',
      media_artist: 'Earth, Wind & Fire',
      media_album_name: 'Greatest Hits',
      media_duration: 209,
      media_position: 100,
      media_position_updated_at: '2026-11-03T10:00:00+00:00',
      entity_picture: '/api/media_player_proxy/media_player.salon?token=x',
      volume_level: 0.4,
      is_volume_muted: false,
      shuffle: false,
      repeat: 'off',
      source: 'Salon',
      source_list: ['Salon', 'Cuisine'],
    },
  };
});

afterEach(() => vi.useRealTimers());

describe('MediaPlayerMoreInfo', () => {
  it('affiche titre, artiste, album', () => {
    render_();
    expect(screen.getByText('September')).toBeInTheDocument();
    expect(screen.getByText('Earth, Wind & Fire')).toBeInTheDocument();
    expect(screen.getByText('Greatest Hits')).toBeInTheDocument();
  });

  it('résout la pochette par rapport à l’origine de HA connectée (#61)', () => {
    render_();
    expect(screen.getByTestId('media-cover')).toHaveAttribute(
      'src',
      'https://ha.example.org/api/media_player_proxy/media_player.salon?token=x'
    );
    expect(screen.getByTestId('media-backdrop')).toBeInTheDocument();
  });

  it('appelle les bons services', () => {
    render_();
    fireEvent.click(screen.getByLabelText('widgets.media_player.pause'));
    expect(lastCall()).toMatchObject({ domain: 'media_player', service: 'media_play_pause', target: { entity_id: 'media_player.salon' } });
    fireEvent.click(screen.getByLabelText('widgets.media_player.next'));
    expect(lastCall().service).toBe('media_next_track');
    fireEvent.click(screen.getByLabelText('widgets.media_player.previous'));
    expect(lastCall().service).toBe('media_previous_track');
    fireEvent.click(screen.getByLabelText('widgets.media_player.shuffle'));
    expect(lastCall()).toMatchObject({ service: 'shuffle_set', serviceData: { shuffle: true } });
    fireEvent.click(screen.getByLabelText('widgets.media_player.repeatOff'));
    expect(lastCall()).toMatchObject({ service: 'repeat_set', serviceData: { repeat: 'all' } });
    fireEvent.click(screen.getByLabelText('widgets.media_player.mute'));
    expect(lastCall()).toMatchObject({ service: 'volume_mute', serviceData: { is_volume_muted: true } });
    fireEvent.click(screen.getByText('Cuisine'));
    expect(lastCall()).toMatchObject({ service: 'select_source', serviceData: { source: 'Cuisine' } });
  });

  it('envoie le volume (débattu)', () => {
    vi.useFakeTimers();
    render_();
    fireEvent.change(screen.getByLabelText('widgets.media_player.volume'), { target: { value: '70' } });
    act(() => vi.advanceTimersByTime(200));
    expect(lastCall()).toMatchObject({ service: 'volume_set', serviceData: { volume_level: 0.7 } });
  });

  it('fait avancer la progression pendant la lecture', () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-03T10:00:00+00:00') });
    render_();
    expect(screen.getByText('1:40')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('1:45')).toBeInTheDocument();
  });

  it('ne fait pas avancer la progression en pause', () => {
    vi.useFakeTimers({ now: Date.parse('2026-11-03T10:00:00+00:00') });
    entity!.state = 'paused';
    render_();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('1:40')).toBeInTheDocument();
    expect(screen.getByLabelText('widgets.media_player.play')).toBeInTheDocument();
  });

  it('masque les commandes non prises en charge', () => {
    entity!.attributes.supported_features = 1 | 16 | 32; // pause, précédent, suivant
    render_();
    expect(screen.queryByLabelText('widgets.media_player.shuffle')).toBeNull();
    expect(screen.queryByLabelText('widgets.media_player.volume')).toBeNull();
    expect(screen.queryByText('Cuisine')).toBeNull();
  });

  it('gère une entité absente', () => {
    entity = null;
    render_();
    expect(screen.getByText('common.entityNotFound')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mass = (name: string, state: string, title: string) => ({
  state,
  attributes: { friendly_name: name, mass_player_type: 'player', media_title: title },
});
const entities: Record<string, { state: string; attributes: Record<string, unknown> }> = {};
const hassState = { helpers: { callService: vi.fn() }, connection: {}, entities };
let config: Record<string, unknown> = {};

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: (id: string) => entities[id] ?? null }));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'w1' }));
vi.mock('@/hooks/useSoundFeedback', () => ({ useSoundFeedback: () => vi.fn() }));

import { MediaPlayerCard } from './MediaPlayerCard';

describe('MediaPlayerCard', () => {
  beforeEach(() => {
    for (const k of Object.keys(entities)) delete entities[k];
    entities['media_player.salon_2'] = mass('Salon', 'idle', 'Believer');
    entities['media_player.cuisine'] = mass('Cuisine', 'playing', 'Thunder');
  });

  it('montre le lecteur choisi', () => {
    config = { type: 'media_player', entityId: 'media_player.salon_2' };
    render(<MediaPlayerCard />);
    expect(screen.getByText('Believer')).toBeInTheDocument();
  });

  it("en automatique, suit l'enceinte Music Assistant qui joue, quelle qu'elle soit", () => {
    config = { type: 'media_player', source: 'music_assistant', entityId: 'media_player.salon_2', name: 'Nom fixé' };
    render(<MediaPlayerCard />);
    expect(screen.getByText('Thunder')).toBeInTheDocument();
    // Le nom suit l'enceinte du moment, pas un nom fixé dans la config.
    expect(screen.getByText('Cuisine')).toBeInTheDocument();
    expect(screen.queryByText('Nom fixé')).not.toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const mass = (name: string, state: string, volume: number, extra: Record<string, unknown> = {}) => ({
  state,
  attributes: { friendly_name: name, mass_player_type: 'player', volume_level: volume, ...extra },
});
const hassState = {
  helpers: { callService },
  entities: {
    // HA met le meneur en premier dans group_members.
    'media_player.salon_2': mass('Salon', 'playing', 0.45, { group_members: ['media_player.salon_2', 'media_player.cuisine'] }),
    'media_player.cuisine': mass('Cuisine', 'playing', 0.35, { group_members: ['media_player.salon_2', 'media_player.cuisine'] }),
    'media_player.bureau': mass('Bureau', 'idle', 0.35),
    'media_player.terrasse': mass('Terrasse', 'unavailable', 0),
    // Un groupe défini dans MA : ses membres sont fixés là-bas, il n'est pas proposé.
    'media_player.maison_2': { state: 'off', attributes: { friendly_name: 'Maison', mass_player_type: 'group' } },
  },
};

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));

import { MusicSpeakers } from './MusicSpeakers';

const calls = () => callService.mock.calls.map(c => c[0]);

describe('MusicSpeakers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    callService.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('montre le groupe de l’enceinte de l’appli, et joint ou retire une enceinte', () => {
    render(<MusicSpeakers player='media_player.salon_2' onDone={vi.fn()} />);
    expect(screen.getByText('Salon, Cuisine')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Maison' })).not.toBeInTheDocument();
    // Le meneur ne se décoche pas ; une enceinte hors ligne ne se coche pas.
    expect(screen.getByRole('checkbox', { name: 'Salon' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Terrasse' })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Bureau' }));
    expect(calls().at(-1)).toMatchObject({
      service: 'join',
      target: { entity_id: 'media_player.salon_2' },
      serviceData: { group_members: ['media_player.bureau'] },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Cuisine' }));
    expect(calls().at(-1)).toMatchObject({ service: 'unjoin', target: { entity_id: 'media_player.cuisine' } });
  });

  it("règle le volume du groupe en gardant l'écart entre les enceintes", async () => {
    render(<MusicSpeakers player='media_player.cuisine' onDone={vi.fn()} />);
    // Ouvert depuis un membre : c'est quand même le meneur qui mène.
    const slider = screen.getByRole('slider', { name: 'widgets.music.groupVolume' });
    expect(slider).toHaveValue('40');

    fireEvent.change(slider, { target: { value: '50' } });
    await act(async () => void vi.advanceTimersByTime(150));
    const volumes = Object.fromEntries(
      calls()
        .filter(c => c.service === 'volume_set')
        .map(c => [c.target.entity_id, c.serviceData.volume_level])
    );
    expect(volumes).toEqual({ 'media_player.salon_2': 0.55, 'media_player.cuisine': 0.45 });
  });

  it('montre un groupe défini dans MA sans le laisser changer', () => {
    hassState.entities['media_player.maison_2'] = {
      state: 'idle',
      attributes: { friendly_name: 'Maison', mass_player_type: 'group', group_members: ['media_player.salon_2', 'media_player.bureau'] },
    } as never;
    render(<MusicSpeakers player='media_player.maison_2' onDone={vi.fn()} />);
    expect(screen.getByText('Maison, Salon, Bureau')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Bureau' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'widgets.music.ungroupAll' })).toBeDisabled();
    hassState.entities['media_player.maison_2'] = {
      state: 'off',
      attributes: { friendly_name: 'Maison', mass_player_type: 'group' },
    } as never;
  });

  it('dégroupe tout, puis revient', () => {
    const onDone = vi.fn();
    render(<MusicSpeakers player='media_player.salon_2' onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.ungroupAll' }));
    expect(calls()).toEqual([expect.objectContaining({ service: 'unjoin', target: { entity_id: 'media_player.cuisine' } })]);
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.done' }));
    expect(onDone).toHaveBeenCalled();
  });
});

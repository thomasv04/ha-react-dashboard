import { describe, expect, it } from 'vitest';
import {
  artistLine,
  groupVolume,
  queueDragShift,
  isMassPlayer,
  monogram,
  monogramHue,
  pickMassPlayer,
  shiftVolumes,
  splitTrackTitle,
} from './music-assistant';

describe('music-assistant', () => {
  it('ne reconnaît que les lecteurs publiés par MA', () => {
    expect(isMassPlayer({ attributes: { mass_player_type: 'player' } })).toBe(true);
    expect(isMassPlayer({ attributes: { mass_player_type: 'group' } })).toBe(true);
    // La même enceinte vue par Cast : pas de doublon.
    expect(isMassPlayer({ attributes: { friendly_name: 'Salon' } })).toBe(false);
    expect(isMassPlayer(undefined)).toBe(false);
  });

  it('joint les artistes', () => {
    expect(
      artistLine({
        artists: [
          { uri: 'a', name: 'fun.' },
          { uri: 'b', name: 'Janelle Monáe' },
        ],
      })
    ).toBe('fun., Janelle Monáe');
    expect(artistLine({})).toBe('');
  });

  it('tire un monogramme du nom', () => {
    expect(monogram('Clara Voss')).toBe('CV');
    expect(monogram('Sable')).toBe('S');
    expect(monogram('éloïse marc dupont')).toBe('ÉM');
  });

  it("sépare l'artiste du titre", () => {
    expect(splitTrackTitle('fun. - We Are Young', 'fun.')).toEqual({ artist: 'fun.', title: 'We Are Young' });
    // L'artiste connu passe avant la première coupure.
    expect(splitTrackTitle('AC - DC - Thunder', 'AC - DC')).toEqual({ artist: 'AC - DC', title: 'Thunder' });
    expect(splitTrackTitle('Sable - Nuit - version longue')).toEqual({ artist: 'Sable', title: 'Nuit - version longue' });
    expect(splitTrackTitle('Sans artiste')).toEqual({ artist: '', title: 'Sans artiste' });
  });

  it('ouvre le lecteur MA qui joue, sinon le premier disponible', () => {
    const mass = (state: string) => ({ state, attributes: { mass_player_type: 'player' } });
    expect(
      pickMassPlayer({
        'media_player.a': mass('idle'),
        'media_player.b': mass('playing'),
        'media_player.cast': { state: 'playing', attributes: {} },
      })
    ).toBe('media_player.b');
    expect(pickMassPlayer({ 'media_player.z': mass('idle'), 'media_player.y': mass('unavailable') })).toBe('media_player.z');
    expect(pickMassPlayer({})).toBeUndefined();
    // La dernière enceinte choisie passe avant une enceinte en pause, pas avant celle qui joue.
    const idle = { 'media_player.a': mass('paused'), 'media_player.salon': mass('idle') };
    expect(pickMassPlayer(idle, 'media_player.salon')).toBe('media_player.salon');
    expect(pickMassPlayer({ ...idle, 'media_player.b': mass('playing') }, 'media_player.salon')).toBe('media_player.b');
    expect(pickMassPlayer(idle, 'media_player.disparu')).toBe('media_player.a');
  });

  it('garde la même teinte pour un même nom', () => {
    expect(monogramHue('Sable')).toBe(monogramHue('Sable'));
    expect(monogramHue('Sable')).toBeGreaterThanOrEqual(0);
    expect(monogramHue('Sable')).toBeLessThan(360);
  });

  it("règle un groupe en gardant l'écart entre ses enceintes", () => {
    expect(groupVolume([0.45, 0.3, 0.2])).toBe(32);
    // +10 % pour toutes : l'écart de 25 points entre la plus forte et la plus faible reste.
    expect(shiftVolumes([0.45, 0.3, 0.2], 42)).toEqual([0.55, 0.4, 0.3]);
    // En butée, une enceinte s'arrête à 0 ou 100 % ; les autres suivent.
    expect(shiftVolumes([0.95, 0.5], 82)).toEqual([1, 0.6]);
    expect(shiftVolumes([0.1, 0.4], 0)).toEqual([0, 0.15]);
    expect(groupVolume([])).toBe(0);
  });

  it('arrondit un glisser à la ligne la plus proche, sans sortir de la file', () => {
    expect(queueDragShift(80, 2, 10)).toBe(1);
    expect(queueDragShift(-30, 2, 10)).toBe(0);
    expect(queueDragShift(-200, 2, 10)).toBe(-2);
    expect(queueDragShift(-1000, 2, 10)).toBe(-2);
    expect(queueDragShift(1000, 2, 10)).toBe(7);
  });
});

import { describe, expect, it } from 'vitest';
import { artistLine, isMassPlayer, monogram, splitTrackTitle } from './music-assistant';

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
});

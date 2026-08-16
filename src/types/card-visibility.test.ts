import { describe, it, expect } from 'vitest';
import { isVisible, visibilityEntityIds, type VisibilityCondition } from './card-visibility';

describe('isVisible', () => {
  it('affiche une card sans condition — le cas de toutes celles déjà en place', () => {
    expect(isVisible(undefined, 'lg', {})).toBe(true);
    expect(isVisible([], 'lg', {})).toBe(true);
  });

  it('compare un état', () => {
    const c: VisibilityCondition[] = [{ condition: 'state', entityId: 'binary_sensor.porte', state: 'on' }];
    expect(isVisible(c, 'lg', { 'binary_sensor.porte': 'on' })).toBe(true);
    expect(isVisible(c, 'lg', { 'binary_sensor.porte': 'off' })).toBe(false);
  });

  it('compare une négation', () => {
    const c: VisibilityCondition[] = [{ condition: 'state', entityId: 'sensor.x', stateNot: 'unavailable' }];
    expect(isVisible(c, 'lg', { 'sensor.x': '21.5' })).toBe(true);
    expect(isVisible(c, 'lg', { 'sensor.x': 'unavailable' })).toBe(false);
  });

  it('masque quand l\'entité est absente du store', () => {
    // La condition portait sur une donnée qu'on n'a pas : la supposer vraie
    // ferait apparaître la card au mauvais moment.
    const c: VisibilityCondition[] = [{ condition: 'state', entityId: 'sensor.disparu', state: 'on' }];
    expect(isVisible(c, 'lg', {})).toBe(false);
  });

  it('filtre par taille d\'écran', () => {
    const c: VisibilityCondition[] = [{ condition: 'screen', breakpoints: ['lg', 'md'] }];
    expect(isVisible(c, 'lg', {})).toBe(true);
    expect(isVisible(c, 'md', {})).toBe(true);
    expect(isVisible(c, 'sm', {})).toBe(false);
  });

  it('une liste de breakpoints vide ne filtre rien', () => {
    expect(isVisible([{ condition: 'screen', breakpoints: [] }], 'sm', {})).toBe(true);
  });

  it('cumule les conditions — toutes doivent passer, comme chez Home Assistant', () => {
    const c: VisibilityCondition[] = [
      { condition: 'state', entityId: 'binary_sensor.nuit', state: 'on' },
      { condition: 'screen', breakpoints: ['sm'] },
    ];
    expect(isVisible(c, 'sm', { 'binary_sensor.nuit': 'on' })).toBe(true);
    expect(isVisible(c, 'lg', { 'binary_sensor.nuit': 'on' })).toBe(false);
    expect(isVisible(c, 'sm', { 'binary_sensor.nuit': 'off' })).toBe(false);
  });

  it('ignore une condition d\'état laissée vide', () => {
    // L'utilisateur a ajouté la condition mais n'a rien saisi : ne pas faire
    // disparaître sa card pour autant.
    const c: VisibilityCondition[] = [{ condition: 'state', entityId: 'sensor.x', state: '' }];
    expect(isVisible(c, 'lg', { 'sensor.x': 'peu importe' })).toBe(true);
  });
});

describe('visibilityEntityIds', () => {
  it('ne remonte que les entités réellement citées', () => {
    expect(
      visibilityEntityIds([
        { condition: 'state', entityId: 'sensor.a', state: 'on' },
        { condition: 'screen', breakpoints: ['lg'] },
        { condition: 'state', entityId: '', state: 'on' },
      ])
    ).toEqual(['sensor.a']);
  });

  it('renvoie une liste vide sans condition', () => {
    expect(visibilityEntityIds(undefined)).toEqual([]);
  });
});

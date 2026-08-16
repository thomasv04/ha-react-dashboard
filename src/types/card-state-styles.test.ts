import { describe, it, expect } from 'vitest';
import { matchStateStyle, stateStyleEntityIds, type CardStateStyle } from './card-state-styles';

const rule = (entityId: string, state: string, extra: Partial<CardStateStyle> = {}): CardStateStyle => ({
  when: [{ condition: 'state', entityId, state }],
  ...extra,
});

describe('matchStateStyle', () => {
  it('ne rend rien sans règle', () => {
    expect(matchStateStyle(undefined, 'lg', {})).toBeNull();
    expect(matchStateStyle([], 'lg', {})).toBeNull();
  });

  it('rend la règle satisfaite', () => {
    const styles = [rule('light.salon', 'on', { icon: 'Lightbulb', color: '#f97316' })];
    expect(matchStateStyle(styles, 'lg', { 'light.salon': 'on' })).toMatchObject({ icon: 'Lightbulb', color: '#f97316' });
    expect(matchStateStyle(styles, 'lg', { 'light.salon': 'off' })).toBeNull();
  });

  it("retient la **première** satisfaite — l'ordre est la priorité", () => {
    // L'utilisateur place le cas particulier en haut, comme dans une suite de
    // `if`. Prendre la dernière inverserait son intention.
    const styles = [rule('sensor.x', 'critique', { color: '#ef4444' }), rule('sensor.x', 'critique', { color: '#3b82f6' })];
    expect(matchStateStyle(styles, 'lg', { 'sensor.x': 'critique' })?.color).toBe('#ef4444');
  });

  it('ignore une règle sans condition', () => {
    // Sans ce garde-fou, une règle vide serait toujours satisfaite et
    // masquerait toutes les suivantes — l'affichage se figerait dessus.
    const styles: CardStateStyle[] = [{ when: [], color: '#000' }, rule('light.salon', 'on', { color: '#fff' })];
    expect(matchStateStyle(styles, 'lg', { 'light.salon': 'on' })?.color).toBe('#fff');
  });

  it("cumule les conditions d'une même règle", () => {
    const styles: CardStateStyle[] = [
      {
        when: [
          { condition: 'state', entityId: 'light.salon', state: 'on' },
          { condition: 'screen', breakpoints: ['sm'] },
        ],
        color: '#fff',
      },
    ];
    expect(matchStateStyle(styles, 'sm', { 'light.salon': 'on' })).not.toBeNull();
    expect(matchStateStyle(styles, 'lg', { 'light.salon': 'on' })).toBeNull();
  });
});

describe('stateStyleEntityIds', () => {
  it("remonte les entités de toutes les règles, sans les conditions d'écran", () => {
    const styles: CardStateStyle[] = [
      rule('light.a', 'on'),
      { when: [{ condition: 'screen', breakpoints: ['lg'] }] },
      rule('sensor.b', '21'),
    ];
    expect(stateStyleEntityIds(styles)).toEqual(['light.a', 'sensor.b']);
  });

  it('rend une liste vide sans règle', () => {
    expect(stateStyleEntityIds(undefined)).toEqual([]);
  });
});

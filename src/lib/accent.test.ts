import { describe, expect, it } from 'vitest';
import { accentVars } from './accent';

describe('accentVars', () => {
  it('refuse ce qui n’est pas #rrggbb', () => {
    expect(accentVars('')).toBeNull();
    expect(accentVars('blue')).toBeNull();
    expect(accentVars('#fff')).toBeNull();
  });

  it('pose du texte blanc sur une couleur foncée, foncé sur une claire', () => {
    expect(accentVars('#1f6fb8')!['--ds-user-accent-ink']).toBe('#ffffff');
    expect(accentVars('#f6cf72')!['--ds-user-accent-ink']).toBe('#1b2230');
    expect(accentVars('#f6cf72')!['--ds-user-tile-on-ink']).toBe('#1b2230');
  });

  it('assombrit la tuile allumée et les feuilles', () => {
    const v = accentVars('#e8466b')!;
    expect(v['--ds-user-accent']).toBe('#e8466b');
    expect(v['--ds-user-tile-on']).toBe('#c53c5b');
    expect(v['--ds-user-sheet']).not.toBe(v['--ds-user-accent']);
  });
});

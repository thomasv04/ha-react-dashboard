import { describe, it, expect, vi } from 'vitest';
import { haThemeToTokens, fetchHAThemes } from './ha-themes';
import { THEMES } from '@/config/themes';

describe('haThemeToTokens', () => {
  it('reprend les variables fournies par le thème', () => {
    const tokens = haThemeToTokens({
      'primary-background-color': '#101020',
      'primary-color': '#ff8800',
      'primary-text-color': '#ffffff',
    });

    expect(tokens.bgPrimary).toBe('#101020');
    expect(tokens.accent).toBe('#ff8800');
    expect(tokens.textPrimary).toBe('#ffffff');
  });

  it("n'écrase rien pour les variables absentes", () => {
    // Un thème HA n'a aucun schéma : rien n'est obligatoire. Un thème qui ne
    // définit que l'accent doit donner un dashboard cohérent, pas un dashboard
    // à moitié vide.
    const tokens = haThemeToTokens({ 'primary-color': '#ff8800' });

    expect(tokens.accent).toBe('#ff8800');
    expect(tokens.bgPrimary).toBe(THEMES.dark.tokens.bgPrimary);
    expect(tokens.textSecondary).toBe(THEMES.dark.tokens.textSecondary);
  });

  it('ignore les valeurs vides', () => {
    const tokens = haThemeToTokens({ 'primary-color': '   ', 'card-background-color': '' });
    expect(tokens.accent).toBe(THEMES.dark.tokens.accent);
    expect(tokens.bgCard).toBe(THEMES.dark.tokens.bgCard);
  });

  it('retire la teinte de card', () => {
    // `cardTint` recompose la surface depuis le curseur d'opacité ; garder
    // celle du thème sombre rendrait le curseur incohérent avec la couleur
    // importée.
    const tokens = haThemeToTokens({ 'card-background-color': '#202030' });
    expect(tokens.cardTint).toBeUndefined();
    expect(tokens.bgCard).toBe('#202030');
  });

  it('accepte un thème entièrement vide', () => {
    expect(haThemeToTokens({})).toEqual({ ...THEMES.dark.tokens, cardTint: undefined });
  });
});

describe('fetchHAThemes', () => {
  const connect = (result: unknown) => ({ sendMessagePromise: vi.fn().mockResolvedValue(result) });

  it('liste les thèmes par ordre alphabétique', async () => {
    const themes = await fetchHAThemes(connect({ themes: { zenith: { 'primary-color': '#111' }, aurore: { 'primary-color': '#222' } } }));

    expect(themes.map(t => t.name)).toEqual(['aurore', 'zenith']);
    expect(themes[0].tokens.accent).toBe('#222');
  });

  it("rend une liste vide quand Home Assistant n'a aucun thème", async () => {
    expect(await fetchHAThemes(connect({ themes: {} }))).toEqual([]);
    expect(await fetchHAThemes(connect({}))).toEqual([]);
  });

  it('survit à un thème sans variables', async () => {
    const themes = await fetchHAThemes(connect({ themes: { vide: null } }));
    expect(themes).toHaveLength(1);
    expect(themes[0].tokens.bgPrimary).toBe(THEMES.dark.tokens.bgPrimary);
  });
});

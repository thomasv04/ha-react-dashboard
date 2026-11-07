/**
 * Couleur primaire choisie dans les Paramètres → valeurs des jetons qui en dérivent.
 *
 * `ThemeContext` pose ces variables `--ds-user-*` sur `<html>` avec la classe
 * `theme-custom-accent` ; `index.css` les branche sur `--ds-accent`,
 * `--ds-tile-on`, `--ds-sheet`… Les variables héritent jusque dans la shadow
 * root du mode carte, la classe y est recopiée par `mirrorThemeClasses`.
 */
type RGB = [number, number, number];

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
/** `--ds-ink` du thème clair : le texte foncé posé sur une couleur claire. */
const DARK_INK: RGB = [27, 34, 48];
/** `--ds-ground` sombre, vers lequel on assombrit les feuilles. */
const GROUND: RGB = [7, 9, 12];

const parse = (hex: string): RGB | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const toHex = (c: RGB) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
/** `t` = part de `b` dans le mélange. */
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i] - v) * t) as RGB;

/** Luminance relative WCAG. */
const luminance = (c: RGB) => {
  const [r, g, b] = c.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Blanc ou encre foncée : celui qui se lit le mieux sur `bg`. */
const inkOn = (bg: RGB): RGB => (contrast(bg, WHITE) >= contrast(bg, DARK_INK) ? WHITE : DARK_INK);

/** Les variables à poser pour `hex`, ou `null` si ce n'est pas une couleur `#rrggbb`. */
export function accentVars(hex: string): Record<string, string> | null {
  const accent = parse(hex);
  if (!accent) return null;
  // Comme le défaut (#1f6fb8 sous #3b74e8) : la tuile allumée, un ton sous l'accent.
  const tileOn = mix(accent, BLACK, 0.15);
  const tileOnInk = inkOn(tileOn);
  return {
    '--ds-user-accent': toHex(accent),
    '--ds-user-accent-ink': toHex(inkOn(accent)),
    '--ds-user-tile-on': toHex(tileOn),
    '--ds-user-tile-on-ink': toHex(tileOnInk),
    '--ds-user-tile-on-muted': toHex(mix(tileOnInk, tileOn, 0.2)),
    // Feuilles du thème sombre (lanceur) : l'accent, assez assombri pour porter `--ds-ink`.
    '--ds-user-sheet': toHex(mix(accent, GROUND, 0.6)),
    '--ds-user-sheet-section': toHex(mix(accent, GROUND, 0.48)),
  };
}

export const ACCENT_VAR_NAMES = Object.keys(accentVars('#000000')!);

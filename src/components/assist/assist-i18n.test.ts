import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Les clés `layout.assist.*` utilisées par le composant, dans les deux langues (le mock d'i18n des tests les masquerait). */
const load = (lang: string) => JSON.parse(readFileSync(join(__dirname, `../../i18n/locales/${lang}/layout.json`), 'utf8'));
const flat = (o: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

describe('i18n Assist', () => {
  it('a les mêmes clés en français et en anglais', () => {
    expect(flat(load('fr').assist).sort()).toEqual(flat(load('en').assist).sort());
  });

  it('couvre chaque clé utilisée par le composant', () => {
    const source = readFileSync(join(__dirname, 'AssistSheet.tsx'), 'utf8');
    const used = [...source.matchAll(/t\(`?'?layout\.assist\.([\w.]+)/g)].map(m => m[1]).filter(k => !k.endsWith('.'));
    const keys = flat(load('en').assist);
    for (const key of used) expect(keys, key).toContain(key);
    for (const key of [
      'suggestions.lights',
      'suggestions.temperature',
      'suggestions.lightsOff',
      'errors.unreachable',
      'errors.noAgent',
      'errors.unknown',
    ])
      expect(keys).toContain(key);
  });
});

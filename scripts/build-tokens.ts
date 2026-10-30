/**
 * Génère `src/design/tokens.css` depuis `src/design/tokens.json`, copie du
 * design system « HA Dashboard v2 ». Le premier thème habille `:root` ; les
 * suivants surchargent sous `[data-theme="<id>"]`, posé par `ThemeContext`.
 *
 * Chaque variable est préfixée `--ds-` : sans préfixe, `--accent` et
 * `--radius-lg` écraseraient ceux de shadcn et l'échelle `rounded-*` de Tailwind.
 *
 * Usage : npm run tokens
 */
import fs from 'node:fs';

interface Token {
  name: string;
  value: string | Record<string, string>;
}
interface Tokens {
  color: { themes: { id: string }[]; tokens: Token[] };
  type: { families: Record<string, string> };
  [family: string]: unknown;
}

const SRC = 'src/design/tokens.json';
const OUT = 'src/design/tokens.css';

const tokens = JSON.parse(fs.readFileSync(SRC, 'utf8')) as Tokens;
const [first, ...others] = tokens.color.themes.map(t => t.id);

const valueIn = (t: Token, theme: string) => (typeof t.value === 'string' ? t.value : (t.value[theme] ?? t.value[first]));
const decl = (name: string, value: string) => `  --ds-${name}: ${value};`;

const blocks: string[] = [];
blocks.push(`:root {\n${tokens.color.tokens.map(t => decl(t.name, valueIn(t, first))).join('\n')}\n}`);
for (const theme of others) {
  blocks.push(`[data-theme='${theme}'] {\n${tokens.color.tokens.map(t => decl(t.name, valueIn(t, theme))).join('\n')}\n}`);
}

const scalars = ['spacing', 'radius', 'shadow'].flatMap(family => {
  const list = (tokens[family] as { tokens: Token[] } | undefined)?.tokens ?? [];
  return list.map(t => decl(t.name, valueIn(t, first)));
});
const fonts = Object.entries(tokens.type.families).map(([key, stack]) => decl(`font-${key}`, stack));
blocks.push(`:root {\n${[...scalars, ...fonts].join('\n')}\n}`);

fs.writeFileSync(OUT, `/* Généré par scripts/build-tokens.ts depuis ${SRC} — ne pas modifier à la main. */\n\n${blocks.join('\n\n')}\n`);
console.info(`✓ ${OUT}`);

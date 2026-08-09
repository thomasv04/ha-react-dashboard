/**
 * Vérifie que chaque type de widget est complètement déclaré.
 *
 * Deux façons valides de déclarer un widget :
 *
 * 1. **Manifeste** (recommandé) — `src/components/cards/<Nom>/widget.ts` via
 *    `defineWidget`, plus son import dans `src/widgets/registry.ts`. Tout est
 *    dans le manifeste, il n'y a rien à tenir en phase.
 * 2. **Registres historiques** — une entrée dans chacun des cinq gros objets
 *    centraux. C'est ce que faisaient tous les widgets avant `defineWidget` ;
 *    c'est précisément la synchronisation manuelle que le manifeste supprime.
 *
 * Ce script signale les types incomplets dans l'un et l'autre modèle.
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── Extraction ───────────────────────────────────────────────────────────────

/** Types déclarés dans l'union `GridWidget['type']` */
function unionTypes(): string[] {
  const src = read('src/context/DashboardLayoutContext.tsx');
  const block = src.slice(src.indexOf('export interface GridWidget'), src.indexOf('  x: number;'));
  return [...block.matchAll(/\|\s*'([a-z_]+)'/g)].map(m => m[1]);
}

/** Types déclarés par manifeste ET importés dans le registre */
function manifestTypes(): { declared: string[]; registered: string[] } {
  const cardsDir = path.join(ROOT, 'src/components/cards');
  const declared: string[] = [];
  for (const entry of fs.readdirSync(cardsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(cardsDir, entry.name, 'widget.ts');
    if (!fs.existsSync(manifest)) continue;
    const m = fs.readFileSync(manifest, 'utf8').match(/type:\s*'([a-z_]+)'/);
    if (m) declared.push(m[1]);
  }
  const registry = read('src/widgets/registry.ts');
  const registered = declared.filter(t => {
    const dir = fs
      .readdirSync(cardsDir)
      .find(
        d =>
          fs.existsSync(path.join(cardsDir, d, 'widget.ts')) &&
          fs.readFileSync(path.join(cardsDir, d, 'widget.ts'), 'utf8').includes(`type: '${t}'`)
      );
    return dir ? registry.includes(`cards/${dir}/widget`) : false;
  });
  return { declared, registered };
}

/** Clés d'un objet exporté (première profondeur) */
function objectKeys(src: string, name: string): string[] {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) return [];
  const open = src.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{' || src[i] === '[') depth++;
    else if (src[i] === '}' || src[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return [...src.slice(open, end).matchAll(/^\s{2}'?([a-z_]+)'?:/gm)].map(m => m[1]);
}

function arrayTypes(src: string, name: string): string[] {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) return [];
  // `= [` et non `[` : l'annotation de type contient déjà `[]` (`WidgetMeta[]`),
  // dont le crochet ouvrant faisait terminer le balayage immédiatement.
  const open = src.indexOf('[', src.indexOf('= [', start));
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[' || src[i] === '{') depth++;
    else if (src[i] === ']' || src[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return [...src.slice(open, end).matchAll(/type:\s*'([a-z_]+)'/g)].map(m => m[1]);
}

// ── Vérification ─────────────────────────────────────────────────────────────

const all = unionTypes();
const { declared, registered } = manifestTypes();

const dispositionsSrc = read('src/config/widget-dispositions.ts');
const metaSrc = read('src/components/layout/AddWidgetModal/widget-meta.ts');
const fieldsSrc = read('src/types/widget-fields.ts');
const catalogSrc = read('src/config/widget-catalog.ts');
const registrySrc = read('src/config/widget-registry.tsx');

const legacy: Record<string, string[]> = {
  LEGACY_WIDGET_COMPONENTS: objectKeys(registrySrc, 'LEGACY_WIDGET_COMPONENTS'),
  LEGACY_WIDGET_META: arrayTypes(metaSrc, 'LEGACY_WIDGET_META'),
  LEGACY_WIDGET_CATALOG: arrayTypes(catalogSrc, 'LEGACY_WIDGET_CATALOG'),
  LEGACY_WIDGET_DISPOSITIONS: objectKeys(dispositionsSrc, 'LEGACY_WIDGET_DISPOSITIONS'),
  LEGACY_WIDGET_FIELD_DEFS: objectKeys(fieldsSrc, 'LEGACY_WIDGET_FIELD_DEFS'),
  LEGACY_DEFAULT_WIDGET_CONFIGS: objectKeys(fieldsSrc, 'LEGACY_DEFAULT_WIDGET_CONFIGS'),
};

console.info(`${all.length} types déclarés : ${all.join(', ')}`);
console.info(`${declared.length} par manifeste : ${declared.join(', ') || '—'}\n`);

let failed = false;

// 1. Un manifeste non importé n'existe pas pour l'application
for (const t of declared) {
  if (!registered.includes(t)) {
    failed = true;
    console.warn(chalk.red(`❌ « ${t} » a un manifeste mais n'est pas importé dans src/widgets/registry.ts`));
  }
}

// 2. Un type de l'union doit être servi par un manifeste ou par les registres
for (const t of all) {
  if (registered.includes(t)) continue;
  const missing = Object.entries(legacy)
    .filter(([, keys]) => !keys.includes(t))
    .map(([name]) => name);
  if (missing.length === Object.keys(legacy).length) {
    failed = true;
    console.warn(chalk.red(`❌ « ${t} » n'est déclaré nulle part — ni manifeste, ni registre historique`));
  } else if (missing.length > 0) {
    failed = true;
    console.warn(chalk.red(`❌ « ${t} » (historique) manque dans : ${missing.join(', ')}`));
    console.warn(chalk.dim(`   → le migrer vers un manifeste supprime ce genre d'oubli : npm run new:widget`));
  }
}

// 3. Une entrée historique orpheline (type retiré de l'union)
for (const [name, keys] of Object.entries(legacy)) {
  const extra = keys.filter(k => !all.includes(k));
  if (extra.length) console.warn(chalk.yellow(`⚠️  ${name} contient des types inconnus : ${extra.join(', ')}`));
}

console.info('');
if (failed) {
  console.error(chalk.red('Des widgets sont incomplets.'));
  process.exit(1);
}
console.info(chalk.green('✅ Tous les widgets sont complètement déclarés.'));

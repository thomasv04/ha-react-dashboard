/**
 * Vérifie que chaque type de widget est complètement déclaré.
 *
 * Depuis la 2.2.0 il n'y a **plus qu'une façon** de déclarer un widget : un
 * manifeste `src/components/cards/<Nom>/widget.ts` via `defineWidget`, importé
 * dans `src/widgets/registry.ts`. Les sept registres centraux — composants,
 * méta, catalogue, dispositions, tailles, champs, valeurs par défaut — ont
 * disparu, et avec eux la synchronisation manuelle qu'ils imposaient.
 *
 * Ce script vérifie donc les deux seules choses qui restent à tenir en phase :
 *
 * 1. tout type de l'union `GridWidget['type']` a un manifeste **importé** ;
 * 2. aucun manifeste ne traîne sans import — écrit mais invisible de
 *    l'application, c'est le genre d'oubli qui ne se voit qu'à l'usage.
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Types déclarés dans l'union `GridWidget['type']` */
function unionTypes(): string[] {
  const src = read('src/context/DashboardLayoutContext.tsx');
  const block = src.slice(src.indexOf('export interface GridWidget'), src.indexOf('  x: number;'));
  return [...block.matchAll(/\|\s*'([a-z_]+)'/g)].map(m => m[1]);
}

/** Types déclarés par manifeste, et ceux réellement importés dans le registre. */
function manifestTypes(): { declared: Map<string, string>; registered: Set<string> } {
  const cardsDir = path.join(ROOT, 'src/components/cards');
  const registry = read('src/widgets/registry.ts');

  const declared = new Map<string, string>();
  const registered = new Set<string>();

  for (const entry of fs.readdirSync(cardsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(cardsDir, entry.name, 'widget.ts');
    if (!fs.existsSync(manifest)) continue;

    const type = fs.readFileSync(manifest, 'utf8').match(/type:\s*'([a-z_]+)'/)?.[1];
    if (!type) continue;

    declared.set(type, entry.name);
    if (registry.includes(`cards/${entry.name}/widget`)) registered.add(type);
  }

  return { declared, registered };
}

// ── Vérification ─────────────────────────────────────────────────────────────

const all = unionTypes();
const { declared, registered } = manifestTypes();

console.info(`${all.length} types déclarés dans l'union`);
console.info(`${declared.size} manifestes, dont ${registered.size} importés\n`);

let failed = false;

// 1. Un manifeste non importé n'existe pas pour l'application
for (const [type, dir] of declared) {
  if (!registered.has(type)) {
    failed = true;
    console.warn(chalk.red(`❌ « ${type} » (${dir}) a un manifeste mais n'est pas importé dans src/widgets/registry.ts`));
  }
}

// 2. Un type de l'union sans manifeste n'a rien pour le rendre
for (const type of all) {
  if (!registered.has(type)) {
    failed = true;
    console.warn(chalk.red(`❌ « ${type} » figure dans GridWidget['type'] mais n'a aucun manifeste`));
    console.warn(chalk.dim(`   → npm run new:widget`));
  }
}

// 3. Un manifeste dont le type a quitté l'union ne sera jamais rendu
for (const [type, dir] of declared) {
  if (!all.includes(type)) {
    console.warn(chalk.yellow(`⚠️  « ${type} » (${dir}) a un manifeste mais ne figure pas dans GridWidget['type']`));
  }
}

console.info('');
if (failed) {
  console.error(chalk.red('Des widgets sont incomplets.'));
  process.exit(1);
}
console.info(chalk.green(`✅ ${registered.size} widgets complètement déclarés, tous par manifeste.`));

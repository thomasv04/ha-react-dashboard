/**
 * Vérifie qu'aucun manifeste de widget ne traîne sans import.
 *
 * Un widget se déclare dans `src/components/cards/<Nom>/widget.ts` via
 * `defineWidget`, et s'importe dans `src/widgets/registry.ts`. Tout le reste —
 * union des types, composants, catalogue, méta, tailles, dispositions, champs,
 * valeurs par défaut — en est dérivé, donc vérifié par TypeScript.
 *
 * Reste ce que le compilateur ne peut pas voir : un fichier que personne
 * n'importe n'existe pas pour lui. Un manifeste écrit mais jamais ajouté au
 * registre compile sans broncher et ne se voit qu'à l'usage.
 */
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

const ROOT = path.resolve(import.meta.dirname, '..');
const cardsDir = path.join(ROOT, 'src/components/cards');
const registry = fs.readFileSync(path.join(ROOT, 'src/widgets/registry.ts'), 'utf8');

const orphans = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(cardsDir, e.name, 'widget.ts')))
  .filter(e => !registry.includes(`cards/${e.name}/widget`));

if (orphans.length) {
  for (const { name } of orphans) {
    console.warn(chalk.red(`❌ ${name}/widget.ts n'est pas importé dans src/widgets/registry.ts`));
  }
  process.exit(1);
}

console.info(chalk.green('✅ Tous les manifestes de widgets sont importés.'));

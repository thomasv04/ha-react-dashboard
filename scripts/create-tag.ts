/**
 * Publie une version : bump de `config.yaml`, commit, tag, push.
 *
 *   npm run create-tag              → patch (2.0.18 → 2.0.19), comportement d'origine
 *   npm run create-tag -- --minor   → 2.0.18 → 2.1.0
 *   npm run create-tag -- --major   → 2.0.18 → 3.0.0
 *   npm run create-tag -- 2.4.0     → version explicite
 *
 * Le workflow `addon-release` prend le relais sur le tag : il synchronise
 * `manifest.json` depuis celui-ci, construit les images et publie le zip HACS.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const CONFIG_PATH = 'ha-react-dashboard/config.yaml';
const NOTES_PATH = 'src/data/release-notes.ts';

const capture = (cmd: string) => execSync(cmd, { encoding: 'utf-8' }).trim();
const run = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// ── Garde-fous ───────────────────────────────────────────────────────────────
// Le script commite sur la branche courante puis pousse `main` : lancé depuis
// une branche de travail, il taguait un commit que `main` ne contenait pas.

const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  fail(`Publication depuis « ${branch} ». Le tag doit partir de main — fusionne d'abord.`);
}

if (capture('git status --porcelain')) {
  fail("L'arbre de travail n'est pas propre. Commite ou remise tes changements avant de publier.");
}

// ── Version cible ────────────────────────────────────────────────────────────

const content = readFileSync(CONFIG_PATH, 'utf-8');
const match = content.match(/^version:\s*'([^']+)'/m);
if (!match) fail(`Version introuvable dans ${CONFIG_PATH}`);

const current = match[1];
const [major, minor, patch] = current.split('.').map(Number);

const arg = process.argv.slice(2).find(a => a !== '--');

let next: string;
switch (arg) {
  case undefined:
  case '--patch':
    next = `${major}.${minor}.${patch + 1}`;
    break;
  case '--minor':
    next = `${major}.${minor + 1}.0`;
    break;
  case '--major':
    next = `${major + 1}.0.0`;
    break;
  default:
    if (!/^\d+\.\d+\.\d+$/.test(arg)) {
      fail(`Argument « ${arg} » non reconnu. Attendu : --patch, --minor, --major, ou une version X.Y.Z.`);
    }
    next = arg;
}

// Une version qui recule republierait un tag sous un numéro déjà distribué.
const rank = (v: string) =>
  v
    .split('.')
    .map(Number)
    .reduce((acc, n) => acc * 10_000 + n, 0);
if (rank(next) <= rank(current)) {
  fail(`La version ${next} n'est pas postérieure à ${current}.`);
}

const tag = `v${next}`;
if (capture('git tag --list').split('\n').includes(tag)) {
  fail(`Le tag ${tag} existe déjà.`);
}

// ── Cohérence avec les notes de version ──────────────────────────────────────
// `release-notes.ts` pilote la fenêtre « Nouveautés ». Une version qui ne
// correspond pas au tag affiche un numéro que HACS ne montrera jamais.

try {
  const notesVersion = readFileSync(NOTES_PATH, 'utf-8').match(/version:\s*'([^']+)'/)?.[1];
  if (notesVersion && notesVersion !== next) {
    console.warn(`\n⚠ ${NOTES_PATH} annonce ${notesVersion}, ce tag publie ${next}.`);
    console.warn('  La fenêtre « Nouveautés » affichera un numéro absent de HACS.\n');
  }
} catch {
  // Pas de notes de version : rien à vérifier.
}

// ── Publication ──────────────────────────────────────────────────────────────

writeFileSync(CONFIG_PATH, content.replace(`version: '${current}'`, `version: '${next}'`), 'utf-8');
console.info(`Bumped ${current} → ${next}`);

run(`git add ${CONFIG_PATH}`);
run(`git commit -m "chore: bump version to ${next}"`);
run('git push origin main');
run(`git tag ${tag}`);
run(`git push origin ${tag}`);

console.info(`\nTag ${tag} pushed successfully.`);

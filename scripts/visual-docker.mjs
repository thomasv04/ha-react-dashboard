/**
 * Lance la régression visuelle dans le conteneur Playwright officiel : le
 * Chromium Linux de la CI, quel que soit le système de la machine.
 *
 *   npm run test:visual           compare aux références
 *   npm run test:visual:update    régénère les références
 *
 * Le dépôt est monté en `/src` mais les tests tournent sur une copie, dans le
 * système de fichiers du conteneur : à travers le montage d'un disque Windows,
 * Vite mettait plus de trois minutes à servir sa première page. Seuls les
 * références et les rapports reviennent dans le dépôt. `node_modules` vit dans
 * un volume : les modules natifs installés pour Windows ne tournent pas sous
 * Linux, et l'installation se garde d'une fois sur l'autre.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8'));
const update = process.argv.includes('--update');
const SNAPSHOTS = 'tests/dashboard/visual.spec.ts-snapshots';

const script = `
set -e
# Node de l'image plus récent que les binaires précompilés de better-sqlite3 :
# il se compile, et l'image n'a pas d'outils de compilation.
apt-get update -qq && apt-get install -y -qq --no-install-recommends build-essential python3 > /dev/null
tar -C /src --exclude=./node_modules --exclude=./.git --exclude='./.venv*' --exclude=./data --exclude=./.claude \\
  --exclude=./test-results --exclude=./playwright-report-dashboard -cf - . | tar -C /work -xf -
cd /work
npm ci --no-audit --no-fund
set +e
npx playwright test -c playwright.dashboard.config.ts visual${update ? ' --update-snapshots' : ''}
status=$?
${update ? `mkdir -p /src/${SNAPSHOTS} && cp ${SNAPSHOTS}/*.png /src/${SNAPSHOTS}/` : ''}
rm -rf /src/test-results /src/playwright-report-dashboard
cp -r test-results playwright-report-dashboard /src/ 2> /dev/null
exit $status
`;

const { status } = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '-v',
    `${process.cwd()}:/src`,
    '-v',
    'ha-dashboard-visual-node-modules:/work/node_modules',
    '-w',
    '/work',
    '-e',
    'VISUAL=1',
    `mcr.microsoft.com/playwright:v${version}-noble`,
    'bash',
    '-c',
    script,
  ],
  { stdio: 'inherit' }
);
process.exit(status ?? 1);

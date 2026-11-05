/**
 * Tests de bout en bout dans un vrai Home Assistant, en conteneur : la carte
 * rendue dans la shadow root de Lovelace, servie par l'intégration, branchée
 * sur un vrai WebSocket. Ce que `npm run dev` ne reproduit pas.
 *
 *   npm run test:ha                 build de la carte, HA neuf, tests, ménage
 *   npm run test:ha -- --no-build   réutilise le bundle déjà construit
 *   npm run test:ha -- --keep       laisse HA tourner (http://localhost:18123)
 *
 * `HA_VERSION` change l'image (`stable` : la CI hebdomadaire). Les autres
 * arguments vont à Playwright.
 */
import { spawnSync } from 'node:child_process';

const HA_VERSION = process.env.HA_VERSION ?? '2026.8.1';
const IMAGE = `ghcr.io/home-assistant/home-assistant:${HA_VERSION}`;
const NAME = 'ha-dashboard-e2e';
const URL = 'http://localhost:18123';

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const build = !args.includes('--no-build');
const passThrough = args.filter(a => a !== '--keep' && a !== '--no-build');

const run = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
const must = (cmd, cmdArgs) => {
  const { status } = run(cmd, cmdArgs);
  if (status !== 0) process.exit(status ?? 1);
};

if (build) must('npm', ['run', 'build:panel']);

run('docker', ['rm', '-f', NAME], { stdio: 'ignore' });
must('docker', ['create', '--name', NAME, '-p', '18123:8123', '-e', 'TZ=Europe/Paris', IMAGE]);
must('docker', ['cp', 'tests/ha/config/.', `${NAME}:/config`]);
must('docker', ['cp', 'custom_components', `${NAME}:/config/custom_components`]);
must('docker', ['start', NAME]);

// Le port répond avant que HA ait fini de démarrer : `/api/onboarding` n'existe
// qu'une fois le frontend chargé.
const deadline = Date.now() + 5 * 60_000;
for (;;) {
  const ok = await fetch(`${URL}/api/onboarding`).then(
    r => r.ok,
    () => false
  );
  if (ok) break;
  if (Date.now() > deadline) {
    run('docker', ['logs', '--tail', '100', NAME]);
    console.error(`Home Assistant n'a pas démarré en 5 minutes.`);
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 2000));
}

const { status } = run('npx', ['playwright', 'test', '-c', 'playwright.ha.config.ts', ...passThrough], {
  env: { ...process.env, HA_URL: URL },
});
if (status !== 0) run('docker', ['logs', '--tail', '150', NAME]);
if (!keep) run('docker', ['rm', '-f', NAME], { stdio: 'ignore' });
process.exit(status ?? 1);

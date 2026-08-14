/**
 * Envoie l'intégration `ha_react_dashboard` dans `/config/custom_components`.
 *
 * Sert à l'essayer sur une vraie instance sans passer par HACS, qui exige une
 * release taguée.
 *
 *   npm run build:panel && npm run deploy:integration
 *
 * Deux transports, selon ce qui est configuré dans `.env` :
 *
 * - `HA_CONFIG_PATH` — une simple copie de fichiers vers le dossier de
 *   configuration : partage Samba monté, lecteur réseau, dossier local.
 *   À préférer : aucun mot de passe à stocker, Windows garde celui du partage.
 * - `VITE_SSH_*` — SCP, comme `deploy.ts`, si l'add-on SSH est en place.
 *
 * Puis dans Home Assistant : redémarrer, Paramètres → Appareils et services →
 * Ajouter une intégration → HA React Dashboard.
 */
import { Client, type ScpClient } from 'node-scp';
import * as dotenv from 'dotenv';
import { join } from 'path';
import chalk from 'chalk';
import { access, constants, cp, readdir, readFile, rm, writeFile } from 'fs/promises';

dotenv.config();

const CONFIG_PATH = process.env.HA_CONFIG_PATH;
const USERNAME = process.env.VITE_SSH_USERNAME;
const PASSWORD = process.env.VITE_SSH_PASSWORD;
const HOST = process.env.VITE_SSH_HOSTNAME;
const PORT = 22;

const DOMAIN = 'ha_react_dashboard';
const LOCAL_DIR = `./custom_components/${DOMAIN}`;
const BUNDLE = `${LOCAL_DIR}/www/ha-react-dashboard.js`;
// HA a renommé son dossier de configuration au fil des versions : on essaie les
// deux, comme `deploy.ts`.
const REMOTE_BASES = ['/config', '/homeassistant'];

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureRemoteDir(client: ScpClient, target: string) {
  let current = '';
  for (const segment of target.split('/').filter(Boolean)) {
    current += '/' + segment;
    if (!(await client.exists(current).catch(() => false))) {
      await client.mkdir(current).catch(() => {});
    }
  }
}

async function upload(client: ScpClient, localDir: string, remoteDir: string): Promise<number> {
  let count = 0;
  for (const item of await readdir(localDir, { withFileTypes: true })) {
    const localPath = join(localDir, item.name);
    const remotePath = `${remoteDir}/${item.name}`;
    if (item.isDirectory()) {
      await ensureRemoteDir(client, remotePath);
      count += await upload(client, localPath, remotePath);
    } else if (item.isFile()) {
      await client.uploadFile(localPath, remotePath);
      count += 1;
      if (count % 25 === 0) console.info(chalk.gray(`  ${count} fichiers…`));
    }
  }
  return count;
}

function nextSteps() {
  console.info(chalk.yellow('\nEnsuite, dans Home Assistant :'));
  console.info('  1. Paramètres → Système → Redémarrer');
  console.info('  2. Paramètres → Appareils et services → Ajouter une intégration → HA React Dashboard');
  console.info('  3. Paramètres → Tableaux de bord → React Dashboard → Définir par défaut sur cet appareil');
}

/**
 * Aligne `manifest.json` sur la version de `config.yaml` avant l'envoi.
 *
 * Le manifeste versionné reste figé entre deux releases : c'est le workflow qui
 * le réécrit depuis le tag, et **seulement dans le zip**. Un déploiement local
 * écrasait donc l'installation HACS avec un numéro périmé — Home Assistant
 * affichait une version qui ne correspondait ni à ce qui tournait, ni à ce que
 * HACS croyait avoir posé.
 *
 * Écrit dans l'arbre de travail : le fichier est versionné, `git diff` le
 * montrera. C'est voulu — la valeur doit finir par être commitée.
 */
async function syncManifestVersion() {
  const config = await readFile('ha-react-dashboard/config.yaml', 'utf-8');
  const version = config.match(/^version:\s*'([^']+)'/m)?.[1];
  if (!version) return;

  const path = `${LOCAL_DIR}/manifest.json`;
  const manifest = await readFile(path, 'utf-8');
  const current = manifest.match(/"version":\s*"([^"]+)"/)?.[1];
  if (current === version) return;

  await writeFile(path, manifest.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`), 'utf-8');
  console.info(chalk.yellow(`manifest.json : ${current} → ${version}`));
}

/** Copie directe : partage Samba monté, lecteur réseau ou dossier local. */
async function copyToConfigPath() {
  if (!(await exists(CONFIG_PATH!))) {
    throw new Error(`HA_CONFIG_PATH introuvable : ${CONFIG_PATH}\nLe partage est-il monté et accessible ?`);
  }
  await syncManifestVersion();
  const target = join(CONFIG_PATH!, 'custom_components', DOMAIN);

  // Purge d'abord : sinon un chunk supprimé d'une version à l'autre reste, et
  // l'ancienne feuille de style peut prendre le pas sur la nouvelle.
  await rm(target, { recursive: true, force: true });
  console.info(chalk.blue('Copie de'), LOCAL_DIR, chalk.blue('vers'), target);
  await cp(LOCAL_DIR, target, { recursive: true });

  console.info(chalk.green('\nCopie terminée.'));
  nextSteps();
}

async function main() {
  if (!(await exists(LOCAL_DIR))) throw new Error(`${LOCAL_DIR} introuvable`);
  if (!(await exists(BUNDLE))) throw new Error(`Bundle absent — lancez d'abord \`npm run build:panel\``);

  if (CONFIG_PATH) return copyToConfigPath();

  for (const [name, value] of Object.entries({ VITE_SSH_USERNAME: USERNAME, VITE_SSH_PASSWORD: PASSWORD, VITE_SSH_HOSTNAME: HOST })) {
    if (!value) {
      throw new Error(
        `Ni HA_CONFIG_PATH ni ${name} ne sont définis dans .env.\n` +
          `Le plus simple : monter le partage Samba de HA et poser\n` +
          `  HA_CONFIG_PATH=\\\\<ip-de-ton-ha>\\config`
      );
    }
  }

  const client = await Client({ host: HOST!, port: PORT, username: USERNAME!, password: PASSWORD! });

  try {
    for (const base of REMOTE_BASES) {
      if (!(await client.exists(base).catch(() => false))) continue;

      const remoteDir = `${base}/custom_components/${DOMAIN}`;
      // Purge d'abord : sinon un chunk supprimé d'une version à l'autre reste,
      // et l'ancienne feuille de style peut prendre le pas sur la nouvelle.
      if (await client.exists(remoteDir).catch(() => false)) {
        console.info(chalk.gray('Suppression de'), remoteDir);
        await client.rmdir(remoteDir).catch(() => {});
      }
      await ensureRemoteDir(client, remoteDir);

      console.info(chalk.blue('Envoi de'), LOCAL_DIR, chalk.blue('vers'), remoteDir);
      const count = await upload(client, LOCAL_DIR, remoteDir);

      console.info(chalk.green(`\n${count} fichiers envoyés.`));
      nextSteps();
      return;
    }
    throw new Error(`Aucun dossier de configuration trouvé (${REMOTE_BASES.join(', ')})`);
  } finally {
    client.close();
  }
}

main().catch(err => {
  console.error(chalk.red((err as Error).message));
  process.exit(1);
});

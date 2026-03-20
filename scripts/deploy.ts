import { Client, type ScpClient } from 'node-scp';
import * as dotenv from 'dotenv';
import { join, relative } from 'path';
import chalk from 'chalk';
import { access, constants, readdir } from 'fs/promises';
import prompts from 'prompts';
// intentionally only loading the main .env so we're not using the token at all here.
dotenv.config();

const HA_URL = process.env.VITE_HA_URL;
const HA_TOKEN = process.env.VITE_HA_TOKEN;
const USERNAME = process.env.VITE_SSH_USERNAME;
const PASSWORD = process.env.VITE_SSH_PASSWORD;
const HOST_OR_IP_ADDRESS = process.env.VITE_SSH_HOSTNAME;
const PORT = 22;
const REMOTE_FOLDER_NAME = process.env.VITE_FOLDER_NAME;
const LOCAL_DIRECTORY = './dist';
const REMOTE_PATH = `/www/${REMOTE_FOLDER_NAME}`;

async function confirmDeploymentWithHaToken() {
  if (!HA_TOKEN) {
    return;
  }
  const response = (await prompts({
    type: 'confirm',
    name: 'value',
    message: chalk.yellow(`
WARN: You are about to deploy to Home Assistant with VITE_HA_TOKEN set in .env.

READ MORE - https://shannonhochkins.github.io/ha-component-kit/?path=/docs/introduction-deploying--docs#important;

Would you like to continue?`),
    initial: true,
  })) as { value: boolean };

  if (response.value !== true) {
    process.exit();
  }
}

// helper: ensure remote directory tree exists by creating segments
async function ensureRemoteDir(client: ScpClient, target: string) {
  const segments = target.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += '/' + seg;
    const exists = await client.exists(current).catch(() => false);
    if (!exists) {
      try {
        await client.mkdir(current);
      } catch (err) {
        console.error(chalk.red('Failed to create remote directory segment:', current, (err as Error)?.message ?? 'unknown'));
      }
    }
  }
}

async function checkDirectoryExists() {
  try {
    await access(LOCAL_DIRECTORY, constants.F_OK);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// recursive upload preserving relative structure; returns counts
const uploadDirectoryRecursively = async (
  client: ScpClient,
  localDir: string,
  remoteBase: string
): Promise<{ uploaded: number; failed: number }> => {
  let uploaded = 0;
  let failed = 0;
  const entries = await readdir(localDir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    const relPath = relative(LOCAL_DIRECTORY, localPath); // e.g. assets/img.png
    const remoteTarget = relPath ? `${remoteBase}/${relPath}`.replace(/\\/g, '/') : remoteBase;
    try {
      if (entry.isDirectory()) {
        await ensureRemoteDir(client, remoteTarget);
        const sub = await uploadDirectoryRecursively(client, localPath, remoteBase); // recurse
        uploaded += sub.uploaded;
        failed += sub.failed;
      } else if (entry.isFile()) {
        console.info(chalk.cyan('Uploading file:', relPath));
        try {
          await client.uploadFile(localPath, remoteTarget);
          uploaded++;
        } catch (fileErr) {
          failed++;
          console.error(chalk.red('Failed to upload file:', relPath, (fileErr as Error)?.message ?? 'unknown'));
        }
      } else {
        console.info(chalk.gray('Skipping non-regular entry:', relPath));
      }
    } catch (walkErr) {
      failed++;
      console.error(chalk.red('Error processing entry:', relPath, (walkErr as Error)?.message ?? 'unknown'));
    }
  }
  return { uploaded, failed };
};

async function deploy() {
  try {
    if (!HA_URL) {
      throw new Error('Missing VITE_HA_URL in .env file');
    }
    if (!REMOTE_FOLDER_NAME) {
      throw new Error('Missing VITE_FOLDER_NAME in .env file');
    }
    if (!USERNAME) {
      throw new Error('Missing VITE_SSH_USERNAME in .env file');
    }
    if (!PASSWORD) {
      throw new Error('Missing VITE_SSH_PASSWORD in .env file');
    }
    if (!HOST_OR_IP_ADDRESS) {
      throw new Error('Missing VITE_SSH_HOSTNAME in .env file');
    }
    if (REMOTE_PATH.trim() === '/www/') {
      throw new Error('Missing VITE_FOLDER_NAME resulting in invalid remote path');
    }
    const exists = await checkDirectoryExists();
    if (!exists) {
      throw new Error('Missing ./dist directory, have you run `npm run build`?');
    }
    const client = await Client({
      host: HOST_OR_IP_ADDRESS,
      port: PORT,
      username: USERNAME,
      password: PASSWORD,
    });
    // seems somewhere along the lines, home assistant decided to rename the config directory to homeassistant...
    const directories = ['config', 'homeassistant'];

    let deployed = false;
    let totalUploaded = 0;
    let totalFailed = 0;
    for (const dir of directories) {
      const remoteBase = `/${dir}${REMOTE_PATH.trim()}`; // e.g. /config/www/<folder>
      // Remove existing remote directory (if any) so we mirror local exactly
      try {
        const baseExists = await client.exists(remoteBase);
        // check for remote path length to avoid deleting /config or /homeassistant entirely
        if (baseExists && REMOTE_PATH.trim().length > 4) {
          console.info(chalk.gray('Removing existing remote directory:'), remoteBase);
          await client.rmdir(remoteBase).catch(() => {});
        }
      } catch {
        // ignore removal errors
      }
      await ensureRemoteDir(client, remoteBase);
      console.info(chalk.blue('Starting recursive upload of', LOCAL_DIRECTORY, 'to', remoteBase));
      const { uploaded, failed } = await uploadDirectoryRecursively(client, LOCAL_DIRECTORY, remoteBase);
      totalUploaded += uploaded;
      totalFailed += failed;
      deployed = uploaded > 0 && failed === 0; // only mark success if all files uploaded and at least one file
      // finish after first successful base path
      break;
    }
    client.close();
    if (deployed) {
      console.info(chalk.green(`\nSuccessfully deployed! Uploaded ${totalUploaded} file${totalUploaded === 1 ? '' : 's'}.`));
      const url = join(HA_URL, '/local', REMOTE_FOLDER_NAME, '/index.html');
      console.info(chalk.blue(`\n\nVISIT the following URL to preview your dashboard:\n`));
      console.info(chalk.bgCyan(chalk.underline(url)));
      console.info(
        chalk.yellow(
          '\n\nAlternatively, follow the steps in the ha-component-kit repository to install the addon for Home Assistant so you can load your dashboard from the sidebar!\n\n'
        )
      );
      console.info('\n\n');
    } else {
      if (totalFailed > 0) {
        console.error(
          chalk.red(`Deployment incomplete: ${totalFailed} failure${totalFailed === 1 ? '' : 's'} encountered (uploaded ${totalUploaded}).`)
        );
      } else {
        console.error(chalk.red('Failed to deploy: no valid remote base directory found or no files uploaded.'));
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(chalk.red('Error:', e.message ?? 'unknown error'));
    }
  }
}
await confirmDeploymentWithHaToken();
deploy();

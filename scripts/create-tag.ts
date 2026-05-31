import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const CONFIG_PATH = 'ha-react-dashboard/config.yaml';

// Read current version
const content = readFileSync(CONFIG_PATH, 'utf-8');
const match = content.match(/^version:\s*'([^']+)'/m);
if (!match) {
  console.error('Could not find version in', CONFIG_PATH);
  process.exit(1);
}

const current = match[1];
const parts = current.split('.').map(Number);
parts[2] += 1;
const next = parts.join('.');

// Bump version in config.yaml
const updated = content.replace(`version: '${current}'`, `version: '${next}'`);
writeFileSync(CONFIG_PATH, updated, 'utf-8');

console.log(`Bumped ${current} → ${next}`);

// Git: add, commit, push, tag
const run = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

run(`git add ${CONFIG_PATH}`);
run(`git commit -m "chore: bump version to ${next}"`);
run('git push origin main');
run(`git tag v${next}`);
run(`git push origin v${next}`);

console.log(`\nTag v${next} pushed successfully.`);

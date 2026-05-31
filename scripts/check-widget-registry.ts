/**
 * check-widget-registry.ts
 *
 * Vérifie que chaque type de widget défini dans WidgetConfig a une entrée
 * dans tous les registres obligatoires. Parse les fichiers source pour
 * extraire les clés sans importer de modules React/JSX.
 *
 * Usage: npx tsx scripts/check-widget-registry.ts
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

// ── 1. Extract widget types from WidgetConfig union in widget-types.ts ──────

function extractWidgetTypes(): string[] {
  const src = read('src/types/widget-types.ts');
  // Each config interface has: type: 'xxx'
  const types = new Set<string>();
  for (const m of src.matchAll(/type:\s*'([a-z_]+)'/g)) {
    types.add(m[1]);
  }
  return [...types].sort();
}

// ── 2. Extract keys from object-keyed registries (Record<string, ...>) ──────

function extractObjectKeys(src: string, varName: string): string[] {
  const re = new RegExp(`(?:export\\s+)?const\\s+${varName}[^=]*=\\s*\\{`, 's');
  const startMatch = re.exec(src);
  if (!startMatch) return [];

  const startIdx = startMatch.index + startMatch[0].length;
  const keys: string[] = [];
  let depth = 0;

  let i = startIdx;
  while (i < src.length) {
    const ch = src[i];

    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      if (depth === 0) break; // end of top-level object
      depth--;
      i++;
      continue;
    }
    if (ch === '[') {
      depth++;
      i++;
      continue;
    }
    if (ch === ']') {
      depth--;
      i++;
      continue;
    }

    // Only match keys at depth 0
    if (depth === 0) {
      const keyMatch = src.slice(i).match(/^['"]?([a-z_]+)['"]?\s*:/);
      if (keyMatch) {
        keys.push(keyMatch[1]);
        i += keyMatch[0].length;
        continue;
      }
    }

    i++;
  }

  return keys;
}

// ── 3. Extract types from array-based registries (type: 'xxx') ──────────────

function extractArrayTypes(src: string, varName: string): string[] {
  const re = new RegExp(`(?:export\\s+)?const\\s+${varName}[^=]*=\\s*\\[`, 's');
  const startMatch = re.exec(src);
  if (!startMatch) return [];

  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let endIdx = startIdx;
  for (let i = startIdx; i < src.length && depth > 0; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') depth--;
    endIdx = i;
  }

  const body = src.slice(startIdx, endIdx);
  const types: string[] = [];
  for (const m of body.matchAll(/type:\s*'([a-z_]+)'/g)) {
    types.push(m[1]);
  }
  return types;
}

// ── Main ────────────────────────────────────────────────────────────────────────

const widgetTypes = extractWidgetTypes();
console.log(`Found ${widgetTypes.length} widget types: ${widgetTypes.join(', ')}\n`);

const registrySrc = read('src/config/widget-registry.tsx');
const dispositionsSrc = read('src/config/widget-dispositions.ts');
const metaSrc = read('src/components/layout/AddWidgetModal/widget-meta.ts');
const fieldsSrc = read('src/types/widget-fields.ts');
const layoutCtxSrc = read('src/context/DashboardLayoutContext.tsx');

const registries: { name: string; keys: string[] }[] = [
  { name: 'WIDGET_COMPONENTS', keys: extractObjectKeys(registrySrc, 'WIDGET_COMPONENTS') },
  { name: 'PREVIEW_COMPONENTS', keys: extractObjectKeys(registrySrc, 'PREVIEW_COMPONENTS') },
  { name: 'WIDGET_DISPOSITIONS', keys: extractObjectKeys(dispositionsSrc, 'WIDGET_DISPOSITIONS') },
  { name: 'WIDGET_META', keys: extractArrayTypes(metaSrc, 'WIDGET_META') },
  { name: 'WIDGET_FIELD_DEFS', keys: extractObjectKeys(fieldsSrc, 'WIDGET_FIELD_DEFS') },
  { name: 'DEFAULT_WIDGET_CONFIGS', keys: extractObjectKeys(fieldsSrc, 'DEFAULT_WIDGET_CONFIGS') },
  { name: 'WIDGET_CATALOG', keys: extractArrayTypes(layoutCtxSrc, 'WIDGET_CATALOG') },
];

let hasErrors = false;

for (const { name, keys } of registries) {
  const missing = widgetTypes.filter(t => !keys.includes(t));
  const extra = keys.filter(k => !widgetTypes.includes(k));

  if (missing.length > 0 || extra.length > 0) {
    hasErrors = true;
    console.log(`❌ ${name}:`);
    if (missing.length > 0) console.log(`   Missing: ${missing.join(', ')}`);
    if (extra.length > 0) console.log(`   Extra:   ${extra.join(', ')}`);
  } else {
    console.log(`✅ ${name} — ${keys.length}/${widgetTypes.length} types OK`);
  }
}

console.log('');
if (hasErrors) {
  console.log('Some registries are out of sync. Please fix the issues above.');
  process.exit(1);
} else {
  console.log('All registries are in sync!');
}

/**
 * Génère un widget complet : composant, manifeste, enregistrement, types, i18n.
 *
 *   npm run new:widget                       (interactif)
 *   npm run new:widget -- --type=doorbell --name=Doorbell --domain=binary_sensor
 *
 * Tout ce qui définit le widget vit ensuite dans son manifeste
 * (`src/components/cards/<Nom>Card/widget.ts`) — cf. CLAUDE.md § « Créer un widget ».
 */
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import chalk from 'chalk';

const ROOT = path.resolve(import.meta.dirname, '..');
const p = (...s: string[]) => path.join(ROOT, ...s);

// ── Arguments ────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const RESERVED = new Set(['type', 'id']);

function validateType(v: string): true | string {
  if (!/^[a-z][a-z0-9_]*$/.test(v)) return 'minuscules, chiffres et _ uniquement, commençant par une lettre';
  if (RESERVED.has(v)) return `« ${v} » est réservé`;
  const types = fs.readFileSync(p('src/context/DashboardLayoutContext.tsx'), 'utf8');
  if (new RegExp(`\\|\\s*'${v}'`).test(types)) return `le type « ${v} » existe déjà`;
  return true;
}

// ── Édition guidée par ancres ────────────────────────────────────────────────

/** Insère `insert` juste avant `anchor`, en échouant fort si l'ancre a bougé. */
function insertBefore(file: string, anchor: string, insert: string) {
  const abs = p(file);
  const src = fs.readFileSync(abs, 'utf8');
  if (src.includes(insert.trim())) return; // déjà appliqué
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error(`Ancre introuvable dans ${file} : ${anchor.slice(0, 60)}`);
  fs.writeFileSync(abs, src.slice(0, at) + insert + src.slice(at));
}

function addI18n(type: string, label: string, description: string) {
  for (const [loc, values] of Object.entries({
    fr: { label, description },
    en: { label, description },
  })) {
    const file = p(`src/i18n/locales/${loc}/widgets.json`);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    json[type] = { ...values, ...(json[type] ?? {}) };
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  }
}

// ── Gabarits ─────────────────────────────────────────────────────────────────

const componentTemplate = (name: string, type: string) => `import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ${name}Config } from '@/types/widget-configs';

export function ${name}() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<${name}Config>(widgetId || '${type}');
  const cardRef = useRef<HTMLDivElement>(null);
  // Taille sur les deux axes : \`squat\` = une seule rangée de grille (80 px),
  // il faut alors une disposition en ligne. Cf. \`useWidgetSize\`.
  const size = useWidgetSize(cardRef);

  const entity = useSafeEntity(config?.entityId ?? '');
  const name = config?.name ?? (entity?.attributes.friendly_name as string | undefined) ?? config?.entityId ?? '';

  if (!entity) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-4 flex items-center justify-center h-full'>
        <span className='text-white/30 text-sm'>{t('widgets.${type}.notFound')}</span>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn(
        'gc rounded-3xl h-full overflow-hidden select-none',
        size.squat ? 'px-3.5 py-2 flex items-center gap-3' : 'p-3.5 flex flex-col'
      )}
    >
      <div className='flex-1 min-w-0'>
        <div className='text-white/40 text-xs font-medium truncate'>{name}</div>
        <div className='text-white text-2xl font-light tracking-tight leading-none mt-1'>{entity.state}</div>
      </div>
    </motion.div>
  );
}
`;

const manifestTemplate = (name: string, type: string, label: string, description: string, domain: string) =>
  `import { Gauge } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { ${name}Config } from '@/types/widget-configs';

export default defineWidget({
  type: '${type}',

  component: () => import('./${name}').then(m => ({ default: m.${name} })),

  meta: {
    label: 'widgets.${type}.label',
    description: 'widgets.${type}.description',
    category: 'sensors',
    icon: Gauge,
    color: '#3b82f6',${domain ? `\n    entityDomain: '${domain}',` : ''}
  },

  // Tailles en unités de grille (1 rangée = 80 px par défaut)
  defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  // Champs proposés dans la modale d'édition
  fields: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity'${domain ? `, domain: '${domain}'` : ''} },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
  ],

  defaults: {
    entityId: '',
  } satisfies WidgetDefaults<${name}Config>,
});

// Rappel : ${label} — ${description}
`;

// ── Programme ────────────────────────────────────────────────────────────────

async function main() {
  let type = arg('type');
  let name = arg('name');
  let label = arg('label');
  let description = arg('description');
  let domain = arg('domain') ?? '';

  if (!type || !name) {
    const answers = await prompts(
      [
        { type: 'text', name: 'type', message: 'Type (snake_case, ex. doorbell)', validate: validateType },
        {
          type: 'text',
          name: 'name',
          message: 'Nom du composant (ex. Doorbell → DoorbellCard)',
          format: (v: string) => (v.endsWith('Card') ? v : `${v}Card`),
        },
        { type: 'text', name: 'label', message: 'Libellé affiché', initial: 'Mon widget' },
        { type: 'text', name: 'description', message: 'Description courte', initial: '' },
        { type: 'text', name: 'domain', message: 'Domaine HA (vide si aucun)', initial: '' },
      ],
      { onCancel: () => process.exit(1) }
    );
    type = answers.type;
    name = answers.name;
    label = answers.label;
    description = answers.description;
    domain = answers.domain ?? '';
  }

  if (!type || !name) throw new Error('type et name sont requis');
  const ok = validateType(type);
  if (ok !== true) throw new Error(ok);
  if (!name.endsWith('Card')) name = `${name}Card`;
  label ??= name;
  description ??= '';

  const dir = p('src/components/cards', name);
  if (fs.existsSync(dir)) throw new Error(`${dir} existe déjà`);
  fs.mkdirSync(dir, { recursive: true });

  // 1. Composant + barrel + manifeste
  fs.writeFileSync(path.join(dir, `${name}.tsx`), componentTemplate(name, type));
  fs.writeFileSync(path.join(dir, 'index.ts'), `export { ${name} } from './${name}';\n`);
  fs.writeFileSync(path.join(dir, 'widget.ts'), manifestTemplate(name, type, label, description, domain));

  // 2. Enregistrement — la seule ligne à ajouter dans un fichier partagé
  insertBefore(
    'src/widgets/registry.ts',
    '\nexport const WIDGETS =',
    `import ${type.replace(/_(.)/g, (_, c) => c.toUpperCase())} from '@/components/cards/${name}/widget';\n`
  );
  {
    const abs = p('src/widgets/registry.ts');
    const src = fs.readFileSync(abs, 'utf8');
    const varName = type.replace(/_(.)/g, (_, c: string) => c.toUpperCase());
    if (!new RegExp(`\\b${varName}\\b[,\\]]`).test(src.split('export const WIDGETS')[1] ?? '')) {
      fs.writeFileSync(
        abs,
        // `.replace(/,$/, '')` : le tableau est reformaté par prettier avec une
        // virgule finale. Sans ça on écrivait `fan,, clock` — un trou dans le
        // tableau, donc un `undefined` que `satisfies` refuse.
        src.replace(/(export const WIDGETS = \[)([^\]]*)\]/, (_m, a, b) => `${a}\n  ${b.trim().replace(/,$/, '')},\n  ${varName},\n]`)
      );
    }
  }

  // 3. Union des types de widgets
  insertBefore('src/context/DashboardLayoutContext.tsx', "\n    | 'pellet';", `\n    | '${type}'`);

  // 4. Interface de config + union
  insertBefore(
    'src/types/widget-types.ts',
    'export type WidgetConfig =',
    `export interface ${name}Config {\n  type: '${type}';\n  entityId?: string;\n  name?: string;\n}\n\n`
  );
  insertBefore('src/types/widget-types.ts', '\n  | RoomsGridConfig;', `\n  | ${name}Config`);
  insertBefore('src/types/widget-configs.ts', '\n  WidgetConfig,\n  WidgetConfigs,', `\n  ${name}Config,`);

  // 5. i18n (fr + en)
  addI18n(type, label, description);

  console.info(chalk.green(`\n✅ Widget « ${type} » créé.\n`));
  console.info(`   ${chalk.dim('composant  ')} src/components/cards/${name}/${name}.tsx`);
  console.info(`   ${chalk.dim('manifeste  ')} src/components/cards/${name}/widget.ts`);
  console.info(`   ${chalk.dim('enregistré ')} src/widgets/registry.ts`);
  console.info(`   ${chalk.dim('types      ')} src/types/widget-types.ts, src/context/DashboardLayoutContext.tsx`);
  console.info(`   ${chalk.dim('i18n       ')} src/i18n/locales/{fr,en}/widgets.json`);
  console.info(`\n   Vérifier : ${chalk.cyan('npm run check:widgets && npm run type-check')}\n`);
}

main().catch(e => {
  console.error(chalk.red(`\n❌ ${e.message}\n`));
  process.exit(1);
});

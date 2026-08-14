# HA Dashboard — Claude Code Instructions

# RTK — Token-Optimized CLI

**rtk** is a CLI proxy that filters and compresses command outputs, saving 60-90% tokens.

## Rule

Always prefix shell commands with `rtk`:

```bash
# Instead of:              Use:
git status                  
git log -10                rtk git log -10
cargo test                 rtk cargo test
docker ps                  rtk docker ps
kubectl get pods           rtk kubectl pods
```

## Meta commands (use directly)

```bash
rtk gain              # Token savings dashboard
rtk gain --history    # Per-command savings history
rtk discover          # Find missed rtk opportunities
rtk proxy <cmd>       # Run raw (no filtering) but track usage
```

## Releasing a new version (MANDATORY)

When asked to create a new tag / release, **always** use:

```bash
npm run create-tag              # patch : 2.0.18 → 2.0.19
npm run create-tag -- --minor   # 2.0.18 → 2.1.0
npm run create-tag -- --major   # 2.0.18 → 3.0.0
npm run create-tag -- 2.4.0     # version explicite
```

This script automatically:
1. Reads the current version from `ha-react-dashboard/config.yaml`
2. Computes the next version (patch by default, see flags above)
3. Commits, pushes to `main`, creates the git tag and pushes it

It refuses to run outside `main`, on a dirty tree, on an existing tag, or on a
version that does not move forward. It also warns when
`src/data/release-notes.ts` announces a different version than the tag.

**Never** manually edit `config.yaml` or run the git commands by hand for a release.

## i18n — Internationalisation (MANDATORY)

All user-visible strings **must** go through the translation system. Never hardcode text in components.

```tsx
import { useI18n } from '@/i18n';

function MyComponent() {
  const { t, tArray } = useI18n();
  return <span>{t('widgets.cover.open')}</span>;
}
```

### Translation files

```
src/i18n/locales/
├── en/          ← English (default language)
│   ├── common.json       — on/off, save, cancel, etc.
│   ├── dashboard.json    — edit mode, pages, loading
│   ├── widgets.json      — all widget strings
│   ├── panels.json       — panel titles and states
│   ├── settings.json     — settings modal strings
│   ├── layout.json       — add widget, edit modal, grid overlay
│   └── activityBar.json  — activity bar pill labels
└── fr/          ← Français (same file structure)
```

- `t('category.key')` — single string
- `tArray('widgets.weather.days')` — string array (e.g. day names)
- `t('panels.vacuum_panel.battery', { value: 85 })` — with `{placeholder}` interpolation
- Keys missing in the current language fall back to English automatically

### Rules

- **Never** write hardcoded French or English text in TSX/TS — always use `t()`
- When adding a new widget: add keys under `widgets.<widgetType>` in both `en/widgets.json` and `fr/widgets.json`
- When adding new UI text: add to the appropriate category file in **both** `en/` and `fr/`
- Translation overrides (user-customised strings) are stored server-side at `GET/PUT /api/translations/overrides`

## Créer un widget

### La commande

```bash
npm run new:widget
```

Le générateur pose quatre questions (type, nom, libellé, domaine HA) puis écrit
le composant, le manifeste, l'enregistrement, les types et les clés i18n `fr`/`en`.
Mode non interactif :

```bash
npm run new:widget -- --type=doorbell --name=Doorbell --domain=binary_sensor
```

Vérifier ensuite avec `npm run check:widgets && npm run type-check`.

### Le manifeste : une seule source de vérité

Tout ce qui définit un widget vit dans `src/components/cards/<Nom>/widget.ts`,
à côté de son composant. Les registres partagés en sont **dérivés** par
`src/widgets/index.ts` — il n'y a rien à tenir en phase à la main.

```ts
import { Gauge } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { DoorbellCardConfig } from '@/types/widget-configs';

export default defineWidget({
  type: 'doorbell',
  component: () => import('./DoorbellCard').then(m => ({ default: m.DoorbellCard })),

  meta: {
    label: 'widgets.doorbell.label',            // clé i18n, jamais du texte
    description: 'widgets.doorbell.description',
    category: 'home',                            // onglet du catalogue
    icon: Gauge,
    color: '#3b82f6',
    entityDomain: 'binary_sensor',               // pré-filtre le sélecteur d'entité
  },

  defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  minSize:     { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: { lg: [{ name: 'Compact', w: 2, h: 1 }, /* … */] },  // facultatif
  dispositions: [/* variantes de mise en page */],                   // facultatif

  fields: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity', domain: 'binary_sensor' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
  ],

  defaults: { entityId: '' } satisfies WidgetDefaults<DoorbellCardConfig>,
});
```

Puis **une seule ligne** dans un fichier partagé — l'import dans
`src/widgets/registry.ts`. Le générateur s'en charge.

Restent deux déclarations que TypeScript ne peut pas dériver d'une valeur, et
que le générateur écrit aussi : le type dans l'union `GridWidget['type']`
(`src/context/DashboardLayoutContext.tsx`) et l'interface de configuration dans
`src/types/widget-types.ts`.

### Anatomie du composant

Une card **doit** s'adapter à sa case, sur les deux axes — les rangées de la
grille font 80 px, une card peut donc être large et très basse :

```tsx
const cardRef = useRef<HTMLDivElement>(null);
const size = useWidgetSize(cardRef);   // { w, h, compact, squat }

// size.squat  → une seule rangée : passer en disposition horizontale
// size.h      → 'squat' | 'short' | 'normal' | 'tall' (1 / 2 / 3 / 4+ rangées)
// size.w      → 'xs' | 'sm' | 'md' | 'lg' | 'xl'
// size.compact→ étroit *ou* écrasé : masquer le contenu secondaire
```

Ne jamais laisser une card déborder de sa case : le contenu serait rogné. Faire
disparaître les blocs secondaires plutôt que de les laisser dépasser.

### Registres historiques

Les widgets antérieurs à `defineWidget` déclarent encore leurs données dans les
gros objets centraux (`LEGACY_WIDGET_META`, `LEGACY_WIDGET_CATALOG`,
`LEGACY_SIZE_PRESETS`, `LEGACY_WIDGET_DISPOSITIONS`, `LEGACY_WIDGET_FIELD_DEFS`,
`LEGACY_DEFAULT_WIDGET_CONFIGS`, `LEGACY_WIDGET_COMPONENTS`). Ils continuent de
fonctionner : `src/widgets/index.ts` applique les manifestes **par-dessus**.

Ne rien ajouter dans ces fichiers pour un nouveau widget. Migrer un widget
existant = déplacer ses entrées dans un manifeste et les retirer des registres.

### Toujours importer depuis `@/widgets`

`WIDGET_COMPONENTS`, `WIDGET_META`, `WIDGET_CATALOG`, `WIDGET_DISPOSITIONS`,
`SIZE_PRESETS`, `WIDGET_FIELD_DEFS`, `DEFAULT_WIDGET_CONFIGS`, `getMinSize`,
`getDisposition` — seul `@/widgets` tient compte des manifestes. Importer
directement depuis `@/config/*` ou `@/types/widget-fields` renvoie les données
historiques, sans les widgets déclarés.

## Panel selects — UI component (MANDATORY)

Never use a native `<select>` to let the user pick a panel (built-in or custom). Always use `PanelSelectField`:

```tsx
import { PanelSelectField } from '@/components/layout/WidgetEditModal/PanelSelectField';

<PanelSelectField
  label='Panneau lié'
  value={panelId}
  onChange={v => setPanelId(v)}
/>
```

- Displays built-in panels with emoji icons, custom panels (from `CustomPanelContext`) in a separate group
- Renders as a styled dropdown portal — respects the current theme
- `value` / `onChange` use the `PanelId` string format (`'lumieres'`, `'custom:my-id'`, or `''` for none)

## Server API

- `GET/PUT /api/config` — dashboard layout (2 MB limit)
- `GET/PUT /api/settings/current?device_id=` — per-device settings
- `GET/PUT /api/translations/overrides` — user translation overrides
- `GET /api/profiles` — user profiles
- `POST /api/uploads/background` — background image upload

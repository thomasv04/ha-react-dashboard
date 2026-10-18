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
npm run create-tag
```

This script automatically:
1. Reads the current version from `ha-react-dashboard/config.yaml`
2. Bumps the patch number (e.g. `2.0.14` → `2.0.15`)
3. Commits, pushes to `main`, creates the git tag and pushes it

**Never** manually edit `config.yaml` or run the git commands by hand for a release.

## i18n — Internationalisation (MANDATORY)

All user-visible strings **must** go through the translation system. Never hardcode text in components.

### How to use

```tsx
import { useI18n } from '@/i18n';

function MyComponent() {
  const { t, tArray } = useI18n();
  return <span>{t('widgets.cover.open')}</span>;
}
```

### Translation files structure

```
src/i18n/locales/
├── en/          ← English (default)
│   ├── common.json
│   ├── dashboard.json
│   ├── widgets.json
│   ├── panels.json
│   ├── settings.json
│   ├── layout.json
│   └── activityBar.json
└── fr/          ← Français
    └── (same files)
```

- Use `t('category.key')` for single strings
- Use `tArray('widgets.weather.days')` for arrays (e.g. day names)
- Add new keys to **both** `en/` and `fr/` files
- Use `{placeholder}` syntax for dynamic values: `t('panels.vacuum_panel.battery', { value: 85 })`

### Rules

- **Never** write French or English text directly in TSX/TS components
- When adding a new widget, add translation keys in `widgets.json` for both locales
- When adding new UI text anywhere, add it to the appropriate category file in both locales

## New widget checklist (MANDATORY)

When implementing any new widget type, ALL of these files must be updated — no exceptions:

| File | What to add |
|------|-------------|
| `src/components/cards/<Name>/<Name>.tsx` | Composant principal |
| `src/components/cards/<Name>/index.ts` | Barrel export |
| `src/types/widget-types.ts` | Interface config + union `WidgetConfig` |
| `src/types/widget-configs.ts` | Re-export de l'interface |
| `src/types/widget-fields.ts` | Default config + field defs |
| `src/config/widget-dispositions.ts` | Entrée `WIDGET_DISPOSITIONS` |
| `src/context/DashboardLayoutContext.tsx` | Union `GridWidget['type']` + `WIDGET_CATALOG` + `SIZE_PRESETS` |
| `src/config/widget-registry.ts` | `PREVIEW_COMPONENTS` + `WIDGET_COMPONENTS` |
| **`src/components/layout/AddWidgetModal/widget-meta.ts`** | **Entrée `WIDGET_META` — sans ça le widget n'apparaît PAS dans le modal d'ajout** |

> `WIDGET_META` est la source de vérité du modal "Ajouter un widget". Un widget absent de cette liste est invisible pour l'utilisateur.


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

- Displays built-in panels with emoji icons, custom panels in a separate group
- Renders as a styled dropdown portal — respects the current theme
- `value` / `onChange` use the `PanelId` string format (`'lumieres'`, `'custom:my-id'`, or `''` for none)

## Themes & CSS — the dashboard also lives in a shadow root (MANDATORY)

As a Home Assistant card (`ha-card.ts` → `ha-panel.tsx`) the dashboard renders **inside the shadow root** of `hui-panel-view`, with its own copy of `dashboard.css`. The dev server (SPA) does **not** reproduce this: a rule can work locally and do nothing for users.

`ThemeContext` puts `theme-*` / `perf-*` classes and `data-theme` on `<html>`, outside the shadow root; `mirrorThemeClasses` (`src/lib/theme-classes.ts`) copies them onto the app container inside it. Only CSS variables cross the boundary on their own (inheritance).

- **Never** use `:root.theme-x`, `html.theme-x` or `:root[data-…]` in a theme rule. Write `.theme-x …`; to keep `:root.theme-x` specificity, double the class: `.theme-x.theme-x`.
- `:root { --var }` is fine for **variables**: set on `<html>`, inherited into the shadow root.
- A new state class on `<html>` must start with `theme-` or `perf-` to be mirrored — otherwise extend the pattern in `theme-classes.ts`.
- Check theme changes **in card mode too**: in HA, `document.documentElement.className` must show up on the `div` child of `ha-react-dashboard-panel`.

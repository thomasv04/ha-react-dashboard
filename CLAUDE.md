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

## New widget checklist (MANDATORY)

When implementing any new widget type, ALL of these files must be updated:

| File | What to add |
|------|-------------|
| `src/components/cards/<Name>/<Name>.tsx` | Main component |
| `src/components/cards/<Name>/index.ts` | Barrel export |
| `src/types/widget-types.ts` | Config interface + `WidgetConfig` union |
| `src/types/widget-configs.ts` | Re-export |
| `src/types/widget-fields.ts` | Default config + field defs |
| `src/config/widget-dispositions.ts` | `WIDGET_DISPOSITIONS` entry |
| `src/context/DashboardLayoutContext.tsx` | `GridWidget['type']` union + `WIDGET_CATALOG` + `SIZE_PRESETS` |
| `src/config/widget-registry.ts` | `PREVIEW_COMPONENTS` + `WIDGET_COMPONENTS` |
| `src/components/layout/AddWidgetModal/widget-meta.ts` | `WIDGET_META` entry |
| `src/i18n/locales/en/widgets.json` + `fr/widgets.json` | Translation keys |

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

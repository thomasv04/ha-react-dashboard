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

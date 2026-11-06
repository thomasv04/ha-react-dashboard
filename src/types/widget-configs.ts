// Barrel — re-exports from widget-types.ts and widget-fields.ts
// Tout ce que déclare widget-types.ts : une liste tenue à la main ici devait
// être mise à jour à chaque widget (et le générateur la patchait).
export type * from './widget-types';

export type { WidgetFieldDef } from './widget-fields';

// `DEFAULT_WIDGET_CONFIGS` / `WIDGET_FIELD_DEFS` ne se réexportent plus d'ici :
// ces registres sont désormais dérivés des manifestes de widgets. Les importer
// depuis `@/widgets`, seule source qui tienne compte de `defineWidget`.

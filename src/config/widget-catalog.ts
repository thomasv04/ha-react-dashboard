import type { GridWidget } from '@/context/DashboardLayoutContext';

/**
 * Catalogue de tous les widgets pouvant être ajoutés/remis dans le dashboard.
 *
 * Extrait de `DashboardLayoutContext` (qui le réexporte) : `@/widgets` doit
 * pouvoir le lire pour dériver le catalogue final, et le contexte dépend lui
 * de `@/widgets` — les laisser dans le même module créait un cycle à
 * l'exécution.
 *
 * Données historiques : un widget déclaré via `defineWidget` n'a pas besoin
 * d'entrée ici, sa `defaultSize` fait foi.
 */
export interface WidgetCatalogEntry {
  type: GridWidget['type'];
  label: string;
  lg: { w: number; h: number };
  md: { w: number; h: number };
  sm: { w: number; h: number };
}

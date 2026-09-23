import type { GridWidget } from '@/context/DashboardLayoutContext';

/**
 * Une entrée du catalogue « Ajouter un widget » : le type et la taille posée à
 * l'ajout. Dérivé des manifestes par `@/widgets`.
 *
 * Ici et non dans `DashboardLayoutContext` : `@/widgets` doit lire ce type, et
 * le contexte dépend lui de `@/widgets` — même module, cycle à l'exécution.
 */
export interface WidgetCatalogEntry {
  type: GridWidget['type'];
  label: string;
  lg: { w: number; h: number };
  md: { w: number; h: number };
  sm: { w: number; h: number };
}

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

export const LEGACY_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { type: 'camera', label: 'Caméra', lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },
  { type: 'weather', label: 'Météo', lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'thermostat', label: 'Thermostat', lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'shortcuts', label: 'Raccourcis', lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
  { type: 'tempo', label: 'Tempo EDF', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'energy', label: 'Énergie', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'sensor', label: 'Capteur', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  { type: 'light', label: 'Lumière', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  { type: 'person', label: 'Personnes', lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
  { type: 'cover', label: 'Volet', lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
  { type: 'template', label: 'Template', lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
  { type: 'automation', label: 'Automatisation', lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
  { type: 'button', label: 'Bouton', lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
  { type: 'group', label: 'Groupe', lg: { w: 4, h: 4 }, md: { w: 6, h: 4 }, sm: { w: 4, h: 4 } },
  { type: 'room', label: 'Pièce', lg: { w: 2, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'media_player', label: 'Lecteur média', lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  { type: 'alarm', label: 'Alarme', lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  { type: 'vacuum', label: 'Aspirateur', lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },
  { type: 'pellet', label: 'Poêle à pellets', lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
  { type: 'activity', label: "Barre d'activité", lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },
  { type: 'greeting', label: 'Horloge', lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
];

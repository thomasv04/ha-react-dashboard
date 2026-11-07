import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import type { CardAppearanceConfig } from '@/types/card-appearance';

/** Vrai quand l'utilisateur a masqué le titre de la card (réglage commun à toutes). */
export function useHideTitle(): boolean {
  const id = useWidgetId();
  const { getWidgetConfig } = useWidgetConfig();
  return (getWidgetConfig(id) as CardAppearanceConfig | undefined)?.hideTitle === true;
}

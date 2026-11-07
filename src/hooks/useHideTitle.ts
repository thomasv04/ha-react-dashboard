import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetConfig } from '@/context/WidgetConfigContext';

/** Vrai quand l'utilisateur a masqué le titre de la card (réglage commun à toutes). */
export function useHideTitle(): boolean {
  const id = useWidgetId();
  const { getWidgetConfig } = useWidgetConfig();
  return getWidgetConfig(id)?.hideTitle === true;
}

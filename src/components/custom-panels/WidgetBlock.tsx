import { WIDGET_COMPONENTS } from '@/widgets';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { WidgetConfigOverride } from '@/context/WidgetConfigContext';
import type { WidgetBlock } from '@/types/custom-panel';
import type { WidgetConfigs } from '@/types/widget-configs';

/** Hauteur d'une rangée de la grille, en pixels. */
const ROW_HEIGHT = 80;

/**
 * Rend n'importe quelle card du registre à l'intérieur d'un panneau.
 *
 * Même patron que `GroupCard`, qui embarque déjà un type arbitraire via
 * `WIDGET_COMPONENTS` — à ceci près que la config vient du bloc et non de la
 * page, d'où le `WidgetConfigOverride`.
 */
export function WidgetBlockRenderer({ block }: { block: WidgetBlock }) {
  const Component = WIDGET_COMPONENTS[block.widgetType as keyof typeof WIDGET_COMPONENTS];
  // Type inconnu — build plus ancien que la config. Le bloc disparaît sans
  // casser le reste du panneau.
  if (!Component) return null;

  const configs = { [block.id]: block.config } as unknown as WidgetConfigs;

  return (
    <WidgetConfigOverride configs={configs}>
      <WidgetIdProvider id={block.id}>
        {/* Hauteur explicite, pas décorative : les cards mesurent leur
            conteneur avec `useWidgetSize` et adaptent leur mise en page. Sans
            hauteur, elles se croient écrasées et masquent leur contenu. */}
        <div style={{ height: (block.rows ?? 4) * ROW_HEIGHT }} className='overflow-hidden rounded-2xl'>
          <Component />
        </div>
      </WidgetIdProvider>
    </WidgetConfigOverride>
  );
}

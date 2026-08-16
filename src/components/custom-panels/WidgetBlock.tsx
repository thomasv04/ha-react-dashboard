import { useRef } from 'react';
import { WIDGET_COMPONENTS } from '@/widgets';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { WidgetConfigOverride } from '@/context/WidgetConfigContext';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { MORE_INFO_WIDGET_TYPES } from '@/components/modals/more-info-registry';
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
  const { openMoreInfo } = useMoreInfo();
  const boxRef = useRef<HTMLDivElement>(null);
  const Component = WIDGET_COMPONENTS[block.widgetType as keyof typeof WIDGET_COMPONENTS];
  // Type inconnu — build plus ancien que la config. Le bloc disparaît sans
  // casser le reste du panneau.
  if (!Component) return null;

  const configs = { [block.id]: block.config } as unknown as WidgetConfigs;

  // Sur la grille, c'est `GridItem` qui ouvre la fiche au clic. Dans un panneau
  // il n'y a pas de `GridItem` : la même card y était inerte, alors qu'elle
  // répond au clic deux écrans plus loin. On rebranche le geste ici.
  const entityId = (block.config as { entityId?: string } | undefined)?.entityId ?? '';
  const hasMoreInfo = MORE_INFO_WIDGET_TYPES.includes(block.widgetType);
  const open = () => openMoreInfo(block.id, block.widgetType, entityId, boxRef.current?.getBoundingClientRect() ?? null);

  return (
    <WidgetConfigOverride configs={configs}>
      <WidgetIdProvider id={block.id}>
        {/* Hauteur explicite, pas décorative : les cards mesurent leur
            conteneur avec `useWidgetSize` et adaptent leur mise en page. Sans
            hauteur, elles se croient écrasées et masquent leur contenu. */}
        <div
          ref={boxRef}
          style={{ height: (block.rows ?? 4) * ROW_HEIGHT }}
          className={`overflow-hidden rounded-2xl${hasMoreInfo ? ' cursor-pointer' : ''}`}
          {...(hasMoreInfo
            ? {
                role: 'button',
                tabIndex: 0,
                onClick: open,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  open();
                },
              }
            : {})}
        >
          <Component />
        </div>
      </WidgetIdProvider>
    </WidgetConfigOverride>
  );
}

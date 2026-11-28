import { useRef } from 'react';
import { WIDGET_COMPONENTS } from '@/widgets';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { WidgetConfigOverride } from '@/context/WidgetConfigContext';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { CARD_CONTROLS, MORE_INFO_ON_HOLD, MORE_INFO_WIDGET_TYPES } from '@/components/modals/more-info-registry';
import { useLongPress } from '@/hooks/useLongPress';
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
  const entityId = (block.config as { entityId?: string } | undefined)?.entityId ?? '';
  const open = () => openMoreInfo(block.id, block.widgetType, entityId, boxRef.current?.getBoundingClientRect() ?? null);
  const { handlers: longPress, moved, held } = useLongPress(open);
  const Component = WIDGET_COMPONENTS[block.widgetType as keyof typeof WIDGET_COMPONENTS];
  // Type inconnu — build plus ancien que la config. Le bloc disparaît sans
  // casser le reste du panneau.
  if (!Component) return null;

  const configs = { [block.id]: block.config } as unknown as WidgetConfigs;

  // Sur la grille, c'est `GridItem` qui ouvre la fiche. Dans un panneau il n'y
  // a pas de `GridItem` : on rebranche les mêmes gestes ici — appui long, et
  // appui simple hors des contrôles de la card (bascule, curseur).
  const hasMoreInfo = MORE_INFO_WIDGET_TYPES.includes(block.widgetType);
  const openOnTap = hasMoreInfo && !MORE_INFO_ON_HOLD.has(block.widgetType);

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
                ...longPress,
                // L'appui long a ouvert la fiche : son relâchement ne bascule pas la lampe.
                onClickCapture: (e: React.MouseEvent) => held.current && e.stopPropagation(),
                onClick: (e: React.MouseEvent) => {
                  if (!openOnTap || moved.current || (e.target as Element).closest(CARD_CONTROLS)) return;
                  open();
                },
                onKeyDown: (e: React.KeyboardEvent) => {
                  // Entrée sur la bascule de la card : c'est elle qui agit.
                  if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
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

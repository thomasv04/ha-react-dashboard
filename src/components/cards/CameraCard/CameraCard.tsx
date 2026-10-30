import { useRef, useState } from 'react';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useHass } from '@hakit/core';
import { useEntities } from '@/hooks/useEntities';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import type { StreamProtocol } from '@/components/ui/CameraFeed/components/CameraFeed';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CameraCardConfig } from '@/types/widget-configs';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useI18n } from '@/i18n';

interface Cam {
  entityId: string;
  name: string;
  posterEntity?: string;
}

export function CameraCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CameraCardConfig>(widgetId || 'camera');
  const cameras: Cam[] = config?.cameras ?? [];
  const selectorEntity = config?.selectorEntity ?? '';
  const streamMode = config?.streamMode ?? 'auto';

  const helpers = useHass(s => s.helpers);
  const entities = useEntities([selectorEntity]);
  const playFeedback = useSoundFeedback();

  const haSelected = entities[selectorEntity]?.state as string | undefined;
  const [localSelected, setLocalSelected] = useState<string>(cameras[0]?.name ?? '');
  const [protocol, setProtocol] = useState<StreamProtocol>(null);
  const selected = haSelected ?? localSelected;

  function select(name: string) {
    setProtocol(null);
    setLocalSelected(name);
    helpers.callService({
      domain: 'input_select',
      service: 'select_option',
      target: { entity_id: selectorEntity },
      serviceData: { option: name },
    });
    playFeedback('click');
  }

  const current = cameras.find(c => c.name === selected) ?? cameras[0];
  // Widget fraîchement posé : aucune caméra choisie. Sans ce garde, la card
  // plantait sur `current.entityId` et emportait tout le dashboard avec elle.
  const hasCamera = !!current;

  // La colonne latérale de 110 px mangeait un tiers d'une card mobile : le flux
  // tombait à ~225 px de large. Sous 380 px, le sélecteur passe en bandeau de
  // pastilles posé sur le flux, qui récupère toute la surface de la card.
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  // La colonne latérale demande de la largeur (au-delà de ~480 px, sinon ses
  // 110 px fixes coûtent plus au flux qu'ils ne rapportent) *et* de la hauteur
  // (une liste verticale de 4 caméras ne tient pas dans deux rangées). Sinon,
  // bandeau de pastilles posé sur le flux.
  const asOverlay = size.w !== 'xl' || (size.h !== 'normal' && size.h !== 'tall');
  const showSelector = cameras.length > 1;

  const chips = (
    <>
      {cameras.map(cam => {
        const isActive = cam.name === selected;
        return (
          <button
            key={cam.name}
            aria-pressed={isActive}
            onClick={e => {
              e.stopPropagation();
              select(cam.name);
            }}
            className={cn(
              'min-h-10 shrink-0 whitespace-nowrap rounded-[var(--ds-radius-pill)] px-4 text-sm font-semibold transition-colors',
              asOverlay ? '' : 'w-full',
              isActive ? 'bg-white text-[#1b2230]' : asOverlay ? 'bg-black/55 text-white' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
            )}
          >
            {cam.name}
          </button>
        );
      })}
    </>
  );

  if (!hasCamera) {
    return (
      <div
        ref={cardRef}
        className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] flex h-full items-center justify-center p-5 text-center'
      >
        <p className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.camera.empty')}</p>
      </div>
    );
  }

  return (
    <div ref={cardRef} className='flex h-full gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)]'>
      {/* ── Single camera feed ── */}
      <div className='relative min-w-0 flex-1 overflow-hidden bg-black'>
        <CameraFeed
          key={current.entityId}
          entityId={current.entityId}
          streamMode={streamMode}
          posterEntity={current.posterEntity}
          className='w-full h-full'
          onProtocol={setProtocol}
        />

        {/* Sélecteur en bandeau — cards étroites */}
        {asOverlay && showSelector && (
          <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-6'>
            <div className='flex gap-2 overflow-x-auto scrollbar-none'>{chips}</div>
          </div>
        )}

        {/* Camera name overlay */}
        {/* Nom en haut à gauche, sur l'image, comme les vignettes de la maquette */}
        <div className='pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-3.5 pb-6 pt-3 text-white'>
          <span className='truncate text-[17px] font-semibold'>{current.name}</span>
          {protocol && (
            <span className='shrink-0 rounded-[var(--ds-radius-pill)] bg-black/55 px-2.5 py-1 text-xs font-semibold'>{protocol}</span>
          )}
        </div>
      </div>

      {/* ── Camera list — cards larges ── */}
      {/* `overflow-y-auto` : une installation avec beaucoup de caméras ne peut
          pas faire déborder la card, quelle que soit sa hauteur. */}
      {!asOverlay && showSelector && (
        <div className='flex w-[130px] shrink-0 flex-col justify-center gap-2 overflow-y-auto py-3 pr-3 scrollbar-none'>{chips}</div>
      )}
    </div>
  );
}

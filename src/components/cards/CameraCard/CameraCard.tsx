import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
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
      {cameras.map((cam, i) => {
        const isActive = cam.name === selected;
        return (
          <motion.button
            key={cam.name}
            initial={{ opacity: 0, x: asOverlay ? 0 : 14, y: asOverlay ? -8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={e => {
              e.stopPropagation();
              select(cam.name);
            }}
            className={cn(
              'font-medium transition-all duration-200 whitespace-nowrap',
              asOverlay
                ? cn(
                    // `min-h-8` : cible tactile praticable sur un bandeau posé
                    // sur le flux, sans manger la vidéo.
                    'px-3 min-h-8 rounded-full text-xs shrink-0 backdrop-blur-md border active:scale-95 transition-transform',
                    isActive ? 'bg-white/85 text-black border-white/60' : 'bg-black/45 text-white/75 border-white/15'
                  )
                : cn(
                    'w-full text-center px-3 py-2.5 rounded-2xl text-sm',
                    isActive
                      ? 'gc-inner text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'text-white/45 hover:text-white/75 hover:bg-white/5'
                  )
            )}
          >
            {cam.name}
          </motion.button>
        );
      })}
    </>
  );

  if (!hasCamera) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-5 h-full flex items-center justify-center text-center'>
        <p className='text-white/35 text-xs leading-relaxed'>{t('widgets.camera.empty')}</p>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className='gc rounded-3xl p-3 flex gap-3 h-full'
    >
      {/* ── Single camera feed ── */}
      <div className='flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-black/50'>
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
          <div className='absolute top-0 left-0 right-0 pt-2 pb-4 px-2 bg-gradient-to-b from-black/55 to-transparent'>
            <div className='flex gap-1.5 overflow-x-auto scrollbar-none'>{chips}</div>
          </div>
        )}

        {/* Camera name overlay */}
        <div className='absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none'>
          <span className='text-xs text-white/75 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full'>{current.name}</span>
          {protocol && (
            <span
              className={cn(
                'text-xs font-medium backdrop-blur-sm px-2 py-1 rounded-full',
                protocol === 'HLS' ? 'bg-blue-500/30 text-blue-200' : 'bg-amber-500/30 text-amber-200'
              )}
            >
              {protocol}
            </span>
          )}
        </div>
      </div>

      {/* ── Camera list — cards larges ── */}
      {/* `overflow-y-auto` : une installation avec beaucoup de caméras ne peut
          pas faire déborder la card, quelle que soit sa hauteur. */}
      {!asOverlay && showSelector && (
        <div className='w-[110px] flex flex-col gap-1.5 justify-center shrink-0 overflow-y-auto scrollbar-none'>{chips}</div>
      )}
    </motion.div>
  );
}

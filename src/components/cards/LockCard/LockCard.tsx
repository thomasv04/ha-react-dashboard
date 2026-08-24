import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Lock, LockOpen, TriangleAlert, DoorOpen } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { LockCardConfig } from '@/types/widget-configs';

/** `LockEntityFeature.OPEN` — le pêne peut être escamoté (gâche électrique) */
const FEATURE_OPEN = 1;

/** Délai avant que la confirmation de déverrouillage retombe */
const CONFIRM_MS = 4000;

export function LockCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<LockCardConfig>(widgetId || 'lock');
  const entityId = config?.entityId ?? '';
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const [confirming, setConfirming] = useState(false);

  // La confirmation retombe seule : une card laissée « armée » sur un mur
  // finirait par déverrouiller sur un frôlement.
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(id);
  }, [confirming]);

  const state = entity?.state ?? 'unknown';

  // La confirmation ne survit pas à un changement d'état venu de la serrure.
  useEffect(() => {
    setConfirming(false);
  }, [state]);

  if (!entity) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-4 flex items-center justify-center h-full'>
        <span className='text-white/30 text-sm'>{t('widgets.lock.notFound')}</span>
      </div>
    );
  }

  const name = config?.name ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const isLocked = state === 'locked';
  const isJammed = state === 'jammed';
  const isMoving = state === 'locking' || state === 'unlocking' || state === 'opening';
  const supportsOpen = (((entity.attributes.supported_features as number | undefined) ?? 0) & FEATURE_OPEN) !== 0;

  const call = (service: 'lock' | 'unlock' | 'open') => {
    helpers.callService({ domain: 'lock', service, target: { entity_id: entityId } });
    playFeedback(service === 'lock' ? 'lock' : 'unlock');
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      // Déverrouiller est l'action irréversible : elle seule peut demander deux
      // appuis. Verrouiller reste immédiat.
      if ((config?.confirmUnlock ?? false) && !confirming) {
        setConfirming(true);
        playFeedback('warning');
        return;
      }
      call('unlock');
    } else {
      call('lock');
    }
    setConfirming(false);
  };

  const accent = isJammed ? '#fbbf24' : isLocked ? '#34d399' : '#f87171';
  const StateIcon = isJammed ? TriangleAlert : isLocked ? Lock : LockOpen;

  const label = confirming
    ? t('widgets.lock.confirmUnlock')
    : isJammed
      ? t('widgets.lock.jammed')
      : isMoving
        ? t(`widgets.lock.${state}`)
        : isLocked
          ? t('widgets.lock.locked')
          : t('widgets.lock.unlocked');

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn(
        'gc rounded-3xl h-full overflow-hidden select-none',
        size.squat ? 'px-3 py-2 flex items-center gap-3' : 'p-3.5 flex flex-col'
      )}
      style={{
        background: `linear-gradient(180deg, ${accent}1f, ${accent}0d)`,
        borderColor: `${accent}3a`,
      }}
    >
      {size.squat ? (
        <>
          <button
            onClick={handleToggle}
            className='w-10 h-10 rounded-xl border flex items-center justify-center shrink-0'
            style={{ background: `${accent}1f`, borderColor: `${accent}40` }}
          >
            <StateIcon size={18} style={{ color: accent }} />
          </button>
          <div className='flex-1 min-w-0'>
            <div className='text-white/40 text-xs font-medium truncate'>{name}</div>
            <div className='text-xs font-semibold truncate' style={{ color: accent }}>
              {label}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className='flex items-center justify-between shrink-0'>
            <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
          </div>

          <div className='flex items-center justify-center flex-1 min-h-0'>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleToggle}
              className={cn(
                'relative border flex items-center justify-center transition-all duration-300',
                size.compact ? 'w-14 h-14 rounded-2xl' : 'w-16 h-16 rounded-2xl'
              )}
              style={{ background: `${accent}1f`, borderColor: `${accent}40` }}
            >
              <div className='absolute inset-0 rounded-2xl blur-xl opacity-20 pointer-events-none' style={{ background: accent }} />
              <StateIcon size={size.compact ? 24 : 28} className='relative' style={{ color: accent }} />
            </motion.button>
          </div>

          <div className='text-center shrink-0 mt-1.5'>
            <span className='text-xs font-semibold' style={{ color: confirming ? '#fbbf24' : accent }}>
              {label}
            </span>
          </div>

          {/* Ouverture du pêne : action distincte, jamais fusionnée au toggle */}
          {supportsOpen && !size.compact && (
            <button
              onClick={e => {
                e.stopPropagation();
                call('open');
              }}
              className='mt-2 shrink-0 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-white/8 bg-white/5 text-white/50 text-[11px] font-semibold hover:bg-white/8 transition-colors'
            >
              <DoorOpen size={12} />
              {t('widgets.lock.openAction')}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

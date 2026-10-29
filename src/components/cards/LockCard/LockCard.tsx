import { useEffect, useRef, useState } from 'react';
import { Lock, LockOpen, TriangleAlert, DoorOpen } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useI18n } from '@/i18n';
import type { LockCardConfig } from '@/types/widget-configs';
import { friendlyName } from '@/lib/ha-service';
import { DeviceTile } from '@/components/ds/DeviceTile';
import { Chip } from '@/components/ds/Chip';

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
      <div ref={cardRef} className='gc flex h-full items-center justify-center p-4'>
        <span className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.lock.notFound')}</span>
      </div>
    );
  }

  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const isLocked = state === 'locked';
  const isJammed = state === 'jammed';
  const isMoving = state === 'locking' || state === 'unlocking' || state === 'opening';
  const supportsOpen = (((entity.attributes.supported_features as number | undefined) ?? 0) & FEATURE_OPEN) !== 0;

  const call = (service: 'lock' | 'unlock' | 'open') => {
    helpers.callService({ domain: 'lock', service, target: { entity_id: entityId } });
    playFeedback(service === 'lock' ? 'lock' : 'unlock');
  };

  const handleToggle = () => {
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
    <div ref={cardRef} className='h-full'>
      <DeviceTile
        name={name}
        state={label}
        icon={isJammed ? TriangleAlert : isLocked ? Lock : LockOpen}
        // Verrouillée = état sûr, mis en avant. Une demande de confirmation
        // repasse la tuile en neutre : on voit que le prochain appui ouvre.
        active={isLocked && !confirming}
        onToggle={handleToggle}
        layout={size.squat ? 'row' : 'stack'}
      >
        {/* Ouverture du pêne : action distincte, jamais fusionnée au bouton */}
        {supportsOpen && !size.compact && <Chip icon={DoorOpen} label={t('widgets.lock.openAction')} onClick={() => call('open')} />}
      </DeviceTile>
    </div>
  );
}

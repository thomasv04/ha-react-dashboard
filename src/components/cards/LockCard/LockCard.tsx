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
import { Sheet } from '@/components/ds/Sheet';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/components/layout/ThemeControlsModal/controls';
import { cn } from '@/lib/utils';

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
  const [sheetOpen, setSheetOpen] = useState(false);

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
      <div
        ref={cardRef}
        className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] flex h-full items-center justify-center p-4'
      >
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

  const StateIcon = isJammed ? TriangleAlert : isLocked ? Lock : LockOpen;
  // Verrouillée = état sûr, mis en avant. Une demande de confirmation
  // repasse la tuile en neutre : on voit que le prochain appui ouvre.
  const secured = isLocked && !confirming;

  // Trois rangées et plus : la tuile de l'Echo Show, en grand. Un bouton rond au
  // centre porte l'action ; orange quand la porte est ouverte, pour qu'on le voie
  // de loin. Plus bas, la tuile reste celle d'une seule icône.
  if (!size.squat && (size.h === 'normal' || size.h === 'tall')) {
    const tall = size.h === 'tall';
    const hint = confirming || isJammed || isMoving ? undefined : t(isLocked ? 'widgets.lock.tapToUnlock' : 'widgets.lock.tapToLock');
    const tone = isJammed
      ? 'border-[3px] border-[var(--ds-alert)] bg-[color-mix(in_srgb,var(--ds-alert)_24%,transparent)] text-[var(--ds-alert)] [--halo:var(--ds-alert)]'
      : secured
        ? 'bg-white/20 text-[var(--ds-tile-on-ink)] [--halo:#fff]'
        : 'border-[3px] border-[var(--ds-heat)] bg-[color-mix(in_srgb,var(--ds-heat)_24%,transparent)] text-[var(--ds-heat-ink)] [--halo:var(--ds-heat)]';
    return (
      <div
        ref={cardRef}
        className={cn(
          'flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] p-[var(--ds-space-4)] transition-colors',
          secured ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'
        )}
      >
        <div className='min-w-0'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div className={cn('truncate text-sm', secured ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>{label}</div>
        </div>
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-8'>
          <button
            onClick={handleToggle}
            aria-pressed={isLocked}
            aria-label={hint ?? label}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
              'shadow-[0_0_0_14px_color-mix(in_srgb,var(--halo)_16%,transparent),0_0_0_30px_color-mix(in_srgb,var(--halo)_7%,transparent)]',
              tall ? 'size-32' : 'size-24',
              tone,
              (isMoving || confirming) && 'animate-pulse'
            )}
          >
            <StateIcon size={tall ? 56 : 42} strokeWidth={1.75} aria-hidden='true' />
          </button>
          {hint && (
            <span className={cn('text-sm font-medium', secured ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>
              {hint}
            </span>
          )}
        </div>
        {supportsOpen && (
          <div className='flex justify-center'>
            <Chip icon={DoorOpen} label={t('widgets.lock.openAction')} onClick={() => call('open')} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={cardRef} className='h-full'>
      <DeviceTile
        name={name}
        state={label}
        icon={StateIcon}
        active={secured}
        onToggle={handleToggle}
        layout={size.squat ? 'row' : 'stack'}
        // Comme la tuile de l'Echo Show : ⋮ en bas à droite. Une seule rangée n'a pas la place.
        onMore={size.squat ? undefined : () => setSheetOpen(true)}
        moreLabel={t('widgets.lock.more')}
        moreAt='bottom'
      >
        {/* Ouverture du pêne : action distincte, jamais fusionnée au bouton */}
        {supportsOpen && !size.compact && <Chip icon={DoorOpen} label={t('widgets.lock.openAction')} onClick={() => call('open')} />}
      </DeviceTile>
      {/* Les actions de la serrure en grand, dont l'ouverture du pêne que la tuile compacte n'a pas la place d'afficher. */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={name} subtitle={label} closeLabel={t('common.close')}>
        <div className='flex flex-col gap-3'>
          <button onClick={handleToggle} className={cn(BUTTON_PRIMARY, 'w-full justify-center')}>
            {isLocked ? <LockOpen size={20} /> : <Lock size={20} />}
            {confirming ? t('widgets.lock.confirmUnlock') : isLocked ? t('widgets.lock.unlockAction') : t('widgets.lock.lockAction')}
          </button>
          {supportsOpen && (
            <button
              onClick={() => {
                call('open');
                setSheetOpen(false);
              }}
              className={cn(BUTTON_SECONDARY, 'w-full justify-center')}
            >
              <DoorOpen size={20} />
              {t('widgets.lock.openDoor')}
            </button>
          )}
        </div>
      </Sheet>
    </div>
  );
}

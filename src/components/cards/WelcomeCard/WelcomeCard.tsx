import { useRef } from 'react';
import { useHass, useUser } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { dayPart, greetingKey } from '@/lib/greeting';
import type { WelcomeCardConfig } from '@/types/widget-configs';

/** Teintes des routines, à tour de rôle — celles des suggestions de la maquette. */
const TINTS = ['bg-[var(--ds-mint)] text-[#06271c]', 'bg-[var(--ds-cool)] text-[#0b1a33]', 'bg-[var(--ds-warm-light)] text-[#2b1a00]'];

/** Une routine : un script ou une scène, lancée d'un geste. */
function Routine({ entityId, tint }: { entityId: string; tint: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const entity = useHass(s => s.entities?.[entityId]);
  const domain = entityId.split('.')[0];
  return (
    <div className={cn('flex min-h-[64px] shrink-0 items-center gap-3 rounded-[var(--ds-radius-xl)] py-2 pl-5 pr-2', tint)}>
      <div className='min-w-0 flex-1'>
        <div className='text-xs font-semibold opacity-80'>{t('widgets.welcome.routine')}</div>
        <div className='truncate text-lg font-bold leading-tight'>{(entity && friendlyName(entity)) ?? entityId}</div>
      </div>
      <button
        onClick={() => callHAService(helpers, domain, 'turn_on', { entity_id: entityId })}
        className='h-11 shrink-0 rounded-[var(--ds-radius-pill)] bg-black/80 px-5 text-sm font-semibold text-white'
      >
        {t('widgets.welcome.start')}
      </button>
    </div>
  );
}

/**
 * « Bonjour Thomas. Belle journée ! » — la card d'accueil de la maquette :
 * la salutation du moment au prénom de l'utilisateur HA, puis les routines
 * qu'on veut avoir sous la main. Le souvenir photo de la maquette attend une
 * source de photos datées.
 */
export function WelcomeCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<WelcomeCardConfig>(widgetId || 'welcome');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const user = useUser();
  const hour = useNow().getHours();

  const firstName = user?.name?.split(' ')[0];
  const headline = firstName ? `${t(greetingKey(hour))} ${firstName}.` : `${t(greetingKey(hour))}.`;
  const routines = config?.routines ?? [];
  const showRoutines = routines.length > 0 && !size.squat && size.h !== 'short';

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col items-center overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center px-4' : 'gap-5 p-[var(--ds-space-5)]'
      )}
    >
      <h2
        className={cn(
          'm-0 text-center font-semibold leading-tight tracking-[-0.5px]',
          size.squat ? 'truncate text-xl' : size.compact ? 'text-2xl' : 'text-[40px]'
        )}
      >
        {headline}
        {!size.squat && (
          <>
            <br />
            {t(`widgets.welcome.wish.${dayPart(hour)}`)}
          </>
        )}
      </h2>
      {showRoutines && (
        <>
          <span aria-hidden='true' className='h-[3px] w-1/3 shrink-0 rounded-full bg-[var(--ds-surface-3)]' />
          <div className='flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
            {routines.map((id, i) => (
              <Routine key={id} entityId={id} tint={TINTS[i % TINTS.length]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

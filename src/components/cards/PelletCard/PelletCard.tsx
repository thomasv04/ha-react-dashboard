import { Flame, Minus, Plus, Power } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { climateRange, snapTemp } from '@/lib/climate';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { PelletCardConfig } from '@/types/widget-configs';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

const ROUND = 'flex size-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95';

export function PelletCard() {
  const { t, language } = useI18n();
  const widgetId = useWidgetId();
  // `useWidgetConfig` renvoie le contexte, pas la config : c'est
  // `getWidgetConfig(id)` qui donne celle du widget.
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<PelletCardConfig>(widgetId || 'pellet');
  const entityId = config?.entityId ?? 'climate.pellet_stove';
  const pellet = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  if (!pellet) return null;

  const currentTemp = pellet.attributes.current_temperature as number | undefined;
  const targetTemp = pellet.attributes.temperature as number | undefined;
  // Lue ici et non dans `setTemp` : une déclaration de fonction est hoistée,
  // TypeScript y abandonne donc le rétrécissement de `pellet`.
  const range = climateRange(pellet.attributes);
  const isOn = pellet.state !== 'off';
  const name = config?.name ?? friendlyName(pellet) ?? t('widgets.pellet.title');
  const temp = (v: number | undefined) => (v !== undefined ? `${v.toLocaleString(language, { maximumFractionDigits: 1 })}°` : '—');

  function setTemp(delta: number) {
    if (targetTemp === undefined) return;

    // Sans pincement, appuyer assez longtemps sortait des bornes de l'entité :
    // Home Assistant rejetait la consigne (`temp_out_of_range`) et la promesse
    // partait en erreur non rattrapée. Le poêle, lui, ne bougeait pas.
    const next = snapTemp(targetTemp + delta, range);
    // Déjà à la butée : ne pas envoyer un appel qui ne changerait rien.
    if (next === targetTemp) return;

    helpers.callService({
      domain: 'climate',
      service: 'set_temperature',
      target: { entity_id: entityId },
      serviceData: { temperature: next },
    });
    playFeedback(delta > 0 ? 'temperature_up' : 'temperature_down');
  }

  function toggle() {
    helpers.callService({
      domain: 'climate',
      service: isOn ? 'turn_off' : 'turn_on',
      target: { entity_id: entityId },
    });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  }

  return (
    <div className='flex h-full select-none flex-col gap-2 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      <div className='flex items-start gap-3'>
        <Flame
          size={22}
          aria-hidden='true'
          className={cn('mt-0.5 shrink-0', isOn ? 'text-[var(--ds-heat)]' : 'text-[var(--ds-ink-muted)]')}
        />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div className={cn('truncate text-sm', isOn ? 'text-[var(--ds-heat-ink)]' : 'text-[var(--ds-ink-muted)]')}>
            {isOn ? t('widgets.pellet.on') : t('widgets.pellet.off')}
          </div>
        </div>
        <button
          onClick={toggle}
          aria-pressed={isOn}
          aria-label={isOn ? t('widgets.pellet.turnOff') : t('widgets.pellet.turnOn')}
          title={isOn ? t('widgets.pellet.turnOff') : t('widgets.pellet.turnOn')}
          className={cn(ROUND, isOn ? 'bg-[var(--ds-heat)] text-[#3d1a05]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]')}
        >
          <Power size={20} />
        </button>
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col items-center justify-center', !isOn && 'opacity-50')}>
        <span className='text-[56px] font-light leading-none tracking-[-2px]'>{temp(targetTemp)}</span>
        <span className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.pellet.currently', { value: temp(currentTemp) })}</span>
      </div>

      {isOn && (
        <div className='flex shrink-0 justify-center gap-4'>
          <button
            onClick={() => setTemp(-0.5)}
            aria-label={t('widgets.pellet.decrease')}
            title={t('widgets.pellet.decrease')}
            className={cn(ROUND, 'bg-[var(--ds-surface-3)]')}
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setTemp(0.5)}
            aria-label={t('widgets.pellet.increase')}
            title={t('widgets.pellet.increase')}
            className={cn(ROUND, 'bg-[var(--ds-surface-3)]')}
          >
            <Plus size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

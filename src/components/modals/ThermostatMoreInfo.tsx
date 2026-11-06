import { Thermometer } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { ThermostatCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { translateOr } from '@/i18n/translate-or';

const HVAC_COLORS: Record<string, string> = {
  heating: '#f97316',
  cooling: '#3b82f6',
  idle: '#6b7280',
  drying: '#eab308',
  off: '#6b7280',
};

export default function ThermostatMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);

  if (!entity) return <div className='p-12 text-[var(--ds-ink-muted)] text-center'>{t('common.entityNotFound')}</div>;

  const name = friendlyName(entity) ?? entityId;
  const currentTemp = entity.attributes.current_temperature as number | undefined;
  const targetTemp = entity.attributes.temperature as number | undefined;
  const hvacAction = (entity.attributes.hvac_action as string) ?? 'idle';
  const hvacModes = (entity.attributes.hvac_modes as string[]) ?? [];
  const fanModes = entity.attributes.fan_modes as string[] | undefined;
  const swingModes = entity.attributes.swing_modes as string[] | undefined;
  const currentFanMode = entity.attributes.fan_mode as string | undefined;
  const currentSwingMode = entity.attributes.swing_mode as string | undefined;
  // Home Assistant n'expose `preset_modes` que si le thermostat en a.
  const presetModes = entity.attributes.preset_modes as string[] | undefined;
  const currentPresetMode = entity.attributes.preset_mode as string | undefined;
  const hvacMode = entity.state;
  const actionColor = HVAC_COLORS[hvacAction] ?? '#6b7280';
  // Les valeurs standard de Home Assistant sont traduites ; une valeur propre à
  // une intégration (`on_low`…) n'a pas de clé et s'affiche telle quelle.
  const label = (group: string) => (value: string) => translateOr(t, `widgets.thermostat.${group}.${value}`, value);
  // Chaque réglage passe par `climate.set_<kind>_mode`, avec la valeur brute de HA.
  const setMode = (kind: string) => (mode: string) =>
    callHAService(helpers, 'climate', `set_${kind}_mode`, { entity_id: entityId }, { [`${kind}_mode`]: mode });
  // [service, titre, options, valeur, traductions] — une rangée de pastilles par réglage que l'entité expose.
  const selects: [string, string, string[] | undefined, string | undefined, string][] = [
    ['hvac', 'hvacMode', hvacModes, hvacMode, 'modes'],
    ['preset', 'presetMode', presetModes, currentPresetMode, 'presetModes'],
    ['fan', 'fanMode', fanModes, currentFanMode, 'fanModes'],
    ['swing', 'swingMode', swingModes, currentSwingMode, 'swingModes'],
  ];

  return (
    <MoreInfoLayout
      showPanel={showInfoPanel}
      sidebar={
        <InfoSidebar
          modules={
            [
              ...selects
                .filter(([, , options]) => options && options.length > 0)
                .map(([kind, title, options, value, group]) => ({
                  type: 'select' as const,
                  title: t(`widgets.thermostat.moreInfo.${title}`),
                  value: value ?? '',
                  options: options ?? [],
                  onChange: setMode(kind),
                  format: label(group),
                })),
              {
                type: 'details' as const,
                title: t('common.moreInfo.info'),
                entries: [
                  {
                    label: t('widgets.thermostat.moreInfo.action'),
                    value: label('hvacActions')(hvacAction),
                    color: `text-[${actionColor}]`,
                  },
                  ...(currentTemp != null ? [{ label: t('widgets.thermostat.currentTemp'), value: `${currentTemp}°C` }] : []),
                  ...(targetTemp != null ? [{ label: t('widgets.thermostat.moreInfo.targetTemp'), value: `${targetTemp}°C` }] : []),
                ],
              },
              { type: 'timeline' as const, entityId },
              { type: 'attributes' as const, entityId },
              { type: 'entityId' as const, entityIds: [entityId] },
            ] satisfies SidebarModule[]
          }
        />
      }
    >
      <MoreInfoHeader icon={Thermometer} name={name} state={label('modes')(hvacMode)} stateColor={actionColor} />

      {/* Gauge — même cadran que la card, en grand */}
      <div className='mx-auto mt-2 w-full max-w-[380px] aspect-[1/1.18]'>
        <WidgetIdProvider id={widgetId}>
          <ThermostatCard />
        </WidgetIdProvider>
      </div>
    </MoreInfoLayout>
  );
}

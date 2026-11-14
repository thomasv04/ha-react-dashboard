import { useMemo, useState } from 'react';
import { ChevronLeft, Lightbulb } from 'lucide-react';
import { useAreas, type Area } from '@hakit/core';
import { PageProvider, type Page } from '@/context/PageContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { DashboardLayoutProvider } from '@/context/DashboardLayoutContext';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { areaEntityIds, areaSensor } from '@/hooks/useAreaControls';
import { useNow } from '@/hooks/useNow';
import { useEntities } from '@/hooks/useEntities';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { buildRoomLayout } from './room-layout';
import { PHONE_ROUND, PHONE_TOP } from './PhoneShell';

const ROOM_PAGE: Page[] = [{ id: 'phone-room', label: '', type: 'grid', order: 0 }];

/** Ce qu'une zone montre dans sa vignette et son en-tête : lumières allumées, température, humidité. */
function useRoomState(area: Area) {
  const lights = areaEntityIds(area, 'light');
  const temperatureId = area.temperature_entity_id ?? areaSensor(area, 'temperature');
  const humidityId = area.humidity_entity_id ?? areaSensor(area, 'humidity');
  const ids = [...lights, temperatureId, humidityId].filter((id): id is string => !!id);
  const entities = useEntities(ids);
  const on = lights.map(id => entities[id]).filter(e => e?.state === 'on');
  const num = (id: string | null | undefined) => {
    const v = Number(id ? entities[id]?.state : NaN);
    return Number.isFinite(v) ? v : undefined;
  };
  // La dernière lumière allumée, pour « Plafonnier allumé il y a 18 min ».
  const last = on.sort((a, b) => (b?.last_changed ?? '').localeCompare(a?.last_changed ?? ''))[0];
  return {
    lightsOn: on.length,
    temperature: num(temperatureId),
    humidity: num(humidityId),
    lastOn: last ? { name: friendlyName(last) ?? last.entity_id, since: last.last_changed } : undefined,
  };
}

/**
 * Onglet Pièces (maquettes « Pièces » et « Pièce — Salon ») : les zones de
 * Home Assistant, filtrables par étage ; un appui ouvre la pièce et ses
 * appareils.
 */
export function PhoneRooms() {
  const { t } = useI18n();
  const areas = useAreas();
  const [floor, setFloor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = areas.find(a => a.area_id === openId);

  // Les étages présents, dans l'ordre de leur niveau.
  const floors = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; level: number }>();
    for (const a of areas) {
      if (a.floor && !seen.has(a.floor.floor_id))
        seen.set(a.floor.floor_id, { id: a.floor.floor_id, name: a.floor.name, level: a.floor.level ?? 0 });
    }
    return [...seen.values()].sort((a, b) => a.level - b.level);
  }, [areas]);

  if (open) return <PhoneRoom area={open} onBack={() => setOpenId(null)} />;

  const shown = floor ? areas.filter(a => a.floor_id === floor) : areas;

  return (
    <div className={cn('flex flex-col gap-2.5 px-4 pb-[180px]', PHONE_TOP)}>
      <h1 className='flex h-11 items-center text-[30px] font-bold'>{t('layout.phone.tabs.rooms')}</h1>
      {floors.length > 0 && (
        <div className='-mr-4 flex gap-2 overflow-x-auto pr-4 scrollbar-none'>
          <Chip current={!floor} onClick={() => setFloor(null)}>
            {t('layout.phone.rooms.all')}
          </Chip>
          {floors.map(f => (
            <Chip key={f.id} current={floor === f.id} onClick={() => setFloor(f.id)}>
              {f.name}
            </Chip>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className='py-10 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.phone.rooms.empty')}</p>
      ) : (
        <div className='grid grid-cols-2 gap-2.5'>
          {shown.map(area => (
            <RoomTile key={area.area_id} area={area} onOpen={() => setOpenId(area.area_id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Pastille de filtre (étages ici, onglets ailleurs). */
export function Chip({ current, onClick, children }: { current: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={current}
      className={cn(
        'flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold',
        current ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)]'
      )}
    >
      {children}
    </button>
  );
}

function useLightsLabel(count: number) {
  const { t } = useI18n();
  if (count === 0) return t('layout.phone.rooms.off');
  return count === 1 ? t('layout.phone.rooms.lightOn') : t('layout.phone.rooms.lightsOn', { count });
}

function RoomTile({ area, onOpen }: { area: Area; onOpen: () => void }) {
  const { lightsOn, temperature } = useRoomState(area);
  const label = useLightsLabel(lightsOn);
  return (
    <button
      onClick={onOpen}
      className='flex h-[118px] flex-col justify-between rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-3.5 py-3 text-left'
    >
      <span className='flex items-center justify-between'>
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            lightsOn ? 'bg-[rgba(246,207,114,0.18)] text-[var(--ds-warm-light)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
          )}
        >
          <Lightbulb size={20} aria-hidden='true' />
        </span>
        {temperature !== undefined && <span className='text-[15px] font-semibold tabular-nums'>{Math.round(temperature)}°</span>}
      </span>
      <span className='min-w-0'>
        <span className='block truncate text-lg font-bold'>{area.name}</span>
        <span className='mt-px block truncate text-[13px] text-[var(--ds-ink-muted)]'>{label}</span>
      </span>
    </button>
  );
}

/** Une pièce : son en-tête, puis ses appareils sur la trame du téléphone. */
function PhoneRoom({ area, onBack }: { area: Area; onBack: () => void }) {
  const { t } = useI18n();
  const { temperature, humidity, lastOn } = useRoomState(area);
  const now = useNow().getTime();
  // Recalculé quand les appareils de la zone changent, pas à chaque état : les fournisseurs
  // ne lisent leur valeur qu'au montage.
  const key = area.entities.map(e => e.entity_id).join(',');
  const areaId = area.area_id;
  const built = useMemo(() => {
    const { layout, widgetConfigs } = buildRoomLayout({ area_id: areaId, entities: key.split(',').map(entity_id => ({ entity_id })) });
    return { layouts: { 'phone-room': layout }, configs: { 'phone-room': widgetConfigs }, empty: layout.panels.length === 0 };
  }, [areaId, key]);

  // Sans horodatage lisible, pas de « il y a » : mieux vaut rien qu'un « NaN ».
  const since = lastOn ? Date.parse(lastOn.since) : NaN;
  const minutes = Math.max(0, Math.round((now - since) / 60_000));
  const ago =
    minutes < 1
      ? t('layout.phone.rooms.justNow')
      : minutes < 60
        ? t('layout.phone.rooms.minutesAgo', { count: minutes })
        : t('layout.phone.rooms.hoursAgo', { count: Math.round(minutes / 60) });
  const summary = [
    lastOn && Number.isFinite(since) && t('layout.phone.rooms.lastOn', { name: lastOn.name, ago }),
    temperature !== undefined && `${Math.round(temperature)}°`,
    humidity !== undefined && `${Math.round(humidity)} %`,
  ].filter(Boolean);

  return (
    <div className={cn('flex flex-col px-4 pb-[180px]', PHONE_TOP)}>
      <div className='flex h-11 items-center gap-3'>
        <button onClick={onBack} aria-label={t('layout.phone.back')} title={t('layout.phone.back')} className={PHONE_ROUND}>
          <ChevronLeft size={22} aria-hidden='true' />
        </button>
        <h1 className='min-w-0 flex-1 truncate text-[22px] font-bold'>{area.name}</h1>
      </div>
      {summary.length > 0 && <p className='mt-1.5 text-sm text-[var(--ds-ink-muted)]'>{summary.join(' · ')}</p>}
      <div className='mt-3'>
        {built.empty ? (
          <p className='py-10 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.phone.rooms.noDevices')}</p>
        ) : (
          // Fournisseurs à part : les tuiles de la pièce ne touchent pas à la configuration du dashboard.
          <PageProvider key={key} initialPages={ROOM_PAGE}>
            <WidgetConfigProvider initialAllWidgetConfigs={built.configs}>
              <DashboardLayoutProvider initialLayouts={built.layouts}>
                <DashboardGrid readonly />
              </DashboardLayoutProvider>
            </WidgetConfigProvider>
          </PageProvider>
        )}
      </div>
    </div>
  );
}

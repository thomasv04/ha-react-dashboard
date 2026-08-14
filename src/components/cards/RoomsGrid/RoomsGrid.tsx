import { motion } from 'framer-motion';
import { DURATION_MEDIUM } from '@/lib/motion-tokens';
import {
  Thermometer,
  Lightbulb,
  Droplets,
  UtensilsCrossed,
  Package,
  Armchair,
  BedDouble,
  Moon,
  Sofa,
  BriefcaseBusiness,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useEntities } from '@/hooks/useEntities';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomsGridConfig, RoomEntry, RoomControl } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconCatalog } from '@/lib/lucide-icon-map';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/utils';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

const FALLBACK_ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Package,
  Armchair,
  BedDouble,
  Moon,
  Sofa,
  BriefcaseBusiness,
};

const DEFAULT_ROOMS: RoomEntry[] = [
  {
    area: 'kitchen',
    label: 'Cuisine',
    icon: 'UtensilsCrossed',
    iconBg: 'from-red-500 to-orange-400',
    tempEntity: 'sensor.kitchen_temperature',
    lightEntities: ['light.kitchen'],
  },
  { area: 'storage', label: 'Cellier', icon: 'Package', iconBg: 'from-purple-500 to-violet-400' },
  {
    area: 'dining_room',
    label: 'Salle à manger',
    icon: 'Armchair',
    iconBg: 'from-lime-500 to-green-400',
    tempEntity: 'sensor.dining_room_temperature',
  },
  { area: 'guest_room', label: 'Ch. invités', icon: 'BedDouble', iconBg: 'from-teal-500 to-cyan-400' },
  {
    area: 'bedroom',
    label: 'Chambre',
    icon: 'Moon',
    iconBg: 'from-pink-500 to-rose-400',
    tempEntity: 'sensor.bedroom_temperature',
    lightEntities: ['light.bedroom'],
  },
  {
    area: 'living_room',
    label: 'Salon',
    icon: 'Sofa',
    iconBg: 'from-yellow-500 to-amber-400',
    lightEntities: ['light.living_room'],
  },
  {
    area: 'office',
    label: 'Bureau',
    icon: 'BriefcaseBusiness',
    iconBg: 'from-indigo-500 to-blue-400',
    tempEntity: 'sensor.office_temperature',
  },
];

// ── Control button ─────────────────────────────────────────────────────────────

function ControlButton({ ctrl }: { ctrl: RoomControl }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { helpers } = useHass();
  const playFeedback = useSoundFeedback();
  const stateEntity = useSafeEntity(ctrl.stateEntity ?? '');
  const isOn = stateEntity ? stateEntity.state === 'on' : false;

  const iconName = ctrl.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  // eslint-disable-next-line react-hooks/static-components
  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? FALLBACK_ICONS[iconName] ?? Lightbulb) : null;

  const color = ctrl.color ?? '#60a5fa';
  const active = ctrl.stateEntity ? isOn : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({
      domain: ctrl.domain as never,
      service: ctrl.service as never,
      target: ctrl.entityId ? { entity_id: ctrl.entityId } : undefined,
    });
    playFeedback('click');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleClick}
      title={ctrl.label}
      className='flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl border transition-all duration-300'
      style={
        active
          ? { background: `${color}18`, borderColor: `${color}30` }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }
      }
    >
      {customIconUrl ? (
        <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
      ) : IconComp ? (
        // eslint-disable-next-line react-hooks/static-components
        <IconComp size={16} style={active ? { color } : { color: 'rgba(255,255,255,0.35)' }} />
      ) : null}
      <span
        className='text-[9px] font-medium leading-none truncate max-w-full px-1'
        style={active ? { color } : { color: 'rgba(255,255,255,0.35)' }}
      >
        {ctrl.label}
      </span>
    </motion.button>
  );
}

// ── Default light controls derived from lightEntities ─────────────────────────

function DefaultLightControls({ entityIds }: { entityIds: string[] }) {
  const { helpers } = useHass();
  const playFeedback = useSoundFeedback();
  const entities = useEntities(entityIds);

  if (!entityIds.length) return null;

  // Aggregate: if any is on
  const anyOn = entityIds.some(id => entities?.[id]?.state === 'on');

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    entityIds.forEach(id => {
      helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: id } });
    });
    playFeedback(anyOn ? 'toggle_off' : 'toggle_on');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleToggleAll}
      className='flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl border transition-all duration-300'
      style={
        anyOn
          ? { background: 'rgba(251,191,36,0.14)', borderColor: 'rgba(251,191,36,0.28)' }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }
      }
    >
      <Lightbulb size={16} style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }} />
      <span className='text-[9px] font-medium leading-none' style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }}>
        {anyOn ? 'Allumé' : 'Éteint'}
      </span>
    </motion.button>
  );
}

// ── Room card ─────────────────────────────────────────────────────────────────

function RoomCard({ room, index }: { room: RoomEntry; index: number }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { openPanel } = usePanel();

  const sensorIds = [room.tempEntity, room.humidityEntity].filter(Boolean) as string[];
  const sensors = useEntities(sensorIds);

  const rawTemp = room.tempEntity ? sensors?.[room.tempEntity]?.state : undefined;
  const temp = rawTemp && rawTemp !== 'unavailable' ? Number(rawTemp) : null;

  const rawHumidity = room.humidityEntity ? sensors?.[room.humidityEntity]?.state : undefined;
  const humidity = rawHumidity && rawHumidity !== 'unavailable' ? Number(rawHumidity) : null;

  const iconName = room.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? FALLBACK_ICONS[iconName] ?? Package) : null;

  const hasControls = (room.controls?.length ?? 0) > 0 || (room.lightEntities?.length ?? 0) > 0;
  const hasPanel = Boolean(room.panelId);

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (room.panelId) openPanel(room.panelId as PanelId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_MEDIUM, delay: index * 0.04 }}
      className='gc rounded-2xl p-3 flex flex-col gap-2 overflow-hidden'
    >
      {/* Header: icon + name + temp */}
      <div className='flex items-start gap-2.5'>
        {/* Colored icon */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${room.iconBg} flex items-center justify-center shrink-0 shadow-md`}>
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className='w-4.5 h-4.5 object-contain' />
          ) : IconComp ? (
            // eslint-disable-next-line react-hooks/static-components
            <IconComp size={17} className='text-white' strokeWidth={1.8} />
          ) : null}
        </div>

        {/* Name + sensors */}
        <div className='flex flex-col min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-1'>
            <span className='text-white/90 text-sm font-semibold leading-tight truncate'>{room.label}</span>
            {hasPanel && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handlePanelClick}
                className='shrink-0 w-5 h-5 rounded-lg flex items-center justify-center border transition-colors'
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <ChevronRight size={11} className='text-white/40' />
              </motion.button>
            )}
          </div>
          <div className='flex items-center gap-2 mt-0.5'>
            {temp !== null && !isNaN(temp) && (
              <span className='text-[11px] text-white/50 font-medium flex items-center gap-0.5'>
                <Thermometer size={10} className='text-white/30' />
                <AnimatedNumber value={temp} decimals={1} suffix='°C' />
              </span>
            )}
            {humidity !== null && !isNaN(humidity) && (
              <span className='text-[11px] text-white/50 font-medium flex items-center gap-0.5'>
                <Droplets size={10} className='text-sky-400/60' />
                {humidity.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls row */}
      {hasControls && (
        <div className='flex gap-1.5'>
          {/* Default light toggle */}
          {(room.lightEntities?.length ?? 0) > 0 && !room.controls?.length && <DefaultLightControls entityIds={room.lightEntities!} />}

          {/* Custom controls */}
          {room.controls?.map((ctrl, i) => (
            <ControlButton key={i} ctrl={ctrl} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomsGrid() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomsGridConfig>(widgetId || 'rooms');

  const rooms = config?.rooms?.length ? config.rooms : DEFAULT_ROOMS;
  const cols = config?.columns ?? 2;

  const gridCols = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className='gc rounded-3xl p-3 h-full flex flex-col overflow-hidden'>
      {/* Title */}
      <div className='flex items-center gap-1 mb-2.5 px-0.5 shrink-0'>
        <span className='text-white/50 text-xs font-semibold uppercase tracking-wider'>Pièces</span>
        <ChevronRight size={12} className='text-white/20' />
      </div>

      {/* Grid */}
      <div
        className={cn('grid gap-2 overflow-y-auto scrollbar-none flex-1', gridCols)}
        style={{ scrollbarWidth: 'none', alignContent: 'start' }}
      >
        {rooms.map((room, i) => (
          <RoomCard key={room.area} room={room} index={i} />
        ))}
      </div>
    </div>
  );
}

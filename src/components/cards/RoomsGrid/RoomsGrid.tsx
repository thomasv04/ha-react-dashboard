import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Lightbulb,
  X,
  Droplets,
  UtensilsCrossed,
  Package,
  Armchair,
  BedDouble,
  Moon,
  Sofa,
  BriefcaseBusiness,
  type LucideIcon,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomsGridConfig } from '@/types/widget-configs';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface RoomConfig {
  area: string;
  label: string;
  Icon: LucideIcon;
  iconBg: string;
  tempEntity?: string;
  humidityEntity?: string;
  lightEntities?: string[];
  panelId?: PanelId;
}

const FALLBACK_ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Package, Armchair, BedDouble, Moon, Sofa, BriefcaseBusiness,
};

const DEFAULT_ROOMS: RoomConfig[] = [
  { area: 'kitchen', label: 'Cuisine', Icon: UtensilsCrossed, iconBg: 'from-red-500 to-orange-400', lightEntities: ['light.kitchen'], tempEntity: 'sensor.kitchen_temperature' },
  { area: 'storage', label: 'Cellier', Icon: Package, iconBg: 'from-purple-500 to-violet-400' },
  { area: 'dining_room', label: 'Salle à manger', Icon: Armchair, iconBg: 'from-lime-500 to-green-400', tempEntity: 'sensor.dining_room_temperature' },
  { area: 'guest_room', label: 'Ch. invités', Icon: BedDouble, iconBg: 'from-teal-500 to-cyan-400' },
  { area: 'bedroom', label: 'Chambre', Icon: Moon, iconBg: 'from-pink-500 to-rose-400', tempEntity: 'sensor.bedroom_temperature', lightEntities: ['light.bedroom'] },
  { area: 'living_room', label: 'Salon', Icon: Sofa, iconBg: 'from-yellow-500 to-amber-400', lightEntities: ['light.living_room'], panelId: 'lumieres' },
  { area: 'office', label: 'Bureau', Icon: BriefcaseBusiness, iconBg: 'from-indigo-500 to-blue-400', tempEntity: 'sensor.office_temperature' },
];

function resolveRooms(config: RoomsGridConfig | undefined): RoomConfig[] {
  if (!config?.rooms?.length) return DEFAULT_ROOMS;
  return config.rooms.map(r => ({
    area: r.area,
    label: r.label,
    Icon: resolveIcon(r.icon) ?? FALLBACK_ICON_MAP[r.icon] ?? Package,
    iconBg: r.iconBg,
    tempEntity: r.tempEntity,
    lightEntities: r.lightEntities,
    panelId: r.panelId as PanelId | undefined,
  }));
}

// ── Room detail modal ──────────────────────────────────────────────────────────

function RoomModal({ room, onClose }: { room: RoomConfig; onClose: () => void }) {
  const entities = useHass(s => s.entities);
  const { openPanel } = usePanel();

  const rawTemp = room.tempEntity ? entities?.[room.tempEntity]?.state : undefined;
  const temp = rawTemp && rawTemp !== 'unavailable' ? Number(rawTemp) : null;

  const rawHumidity = room.humidityEntity ? entities?.[room.humidityEntity]?.state : undefined;
  const humidity = rawHumidity && rawHumidity !== 'unavailable' ? Number(rawHumidity) : null;

  const lights = (room.lightEntities ?? []).map(id => ({
    id,
    name: (entities?.[id]?.attributes?.friendly_name as string) ?? id,
    on: entities?.[id]?.state === 'on',
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className='gc rounded-3xl p-6 w-full max-w-sm'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between mb-5'>
          <div className='flex items-center gap-3'>
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${room.iconBg} flex items-center justify-center shadow-lg`}>
              <room.Icon size={20} className='text-white' strokeWidth={1.8} />
            </div>
            <h2 className='text-white text-xl font-semibold'>{room.label}</h2>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all'
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats row */}
        {(temp !== null || humidity !== null) && (
          <div className='flex gap-3 mb-5'>
            {temp !== null && !isNaN(temp) && (
              <div className='flex-1 rounded-2xl p-3 flex items-center gap-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10'>
                <div className='w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center'>
                  <Thermometer size={16} className='text-blue-400' />
                </div>
                <div>
                  <div className='text-[10px] text-white/40 uppercase tracking-wider'>Température</div>
                  <div className='text-white font-semibold'>{temp.toFixed(1)}°C</div>
                </div>
              </div>
            )}
            {humidity !== null && !isNaN(humidity) && (
              <div className='flex-1 rounded-2xl p-3 flex items-center gap-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10'>
                <div className='w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center'>
                  <Droplets size={16} className='text-cyan-400' />
                </div>
                <div>
                  <div className='text-[10px] text-white/40 uppercase tracking-wider'>Humidité</div>
                  <div className='text-white font-semibold'>{humidity.toFixed(0)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lights */}
        {lights.length > 0 && (
          <div>
            <div className='text-white/40 text-[10px] uppercase tracking-[0.15em] mb-2 font-medium'>Lumières</div>
            <div className='flex flex-col gap-2'>
              {lights.map(light => (
                <div key={light.id} className='rounded-2xl px-4 py-3 flex items-center justify-between bg-gradient-to-br from-white/[0.03] to-white/[0.07] border border-white/8'>
                  <span className='text-white/80 text-sm'>{light.name}</span>
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${light.on ? 'bg-yellow-400' : 'bg-white/15'}`}
                    style={light.on ? { boxShadow: '0 0 8px 3px rgba(250,204,21,0.5)' } : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open panel link */}
        {room.panelId && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              openPanel(room.panelId!);
              onClose();
            }}
            className='mt-4 w-full rounded-2xl px-4 py-3 text-sm text-white/70 hover:text-white transition-all duration-200 text-center bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:border-white/20'
          >
            Voir tous les détails →
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Room row ──────────────────────────────────────────────────────────────────

function RoomRow({ room, index, onOpen }: { room: RoomConfig; index: number; onOpen: () => void }) {
  const entities = useHass(s => s.entities);

  const rawTemp = room.tempEntity ? entities?.[room.tempEntity]?.state : undefined;
  const temp = rawTemp && rawTemp !== 'unavailable' ? Number(rawTemp) : null;

  const lightsOn = (room.lightEntities ?? []).filter(id => entities?.[id]?.state === 'on').length;
  const lightsTotal = room.lightEntities?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: index * 0.04 }}
      whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.04)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className='flex items-center gap-3 py-2.5 px-2 rounded-2xl cursor-pointer transition-colors border-b border-white/[0.04] last:border-0'
    >
      {/* Colored icon square */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: [-2, 2, 0] }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${room.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}
      >
        <room.Icon size={17} className='text-white' strokeWidth={1.8} />
      </motion.div>

      {/* Room name */}
      <span className='text-white/90 text-sm font-medium flex-1 leading-none'>{room.label}</span>

      {/* Thermometer icon if temp exists */}
      {temp !== null && !isNaN(temp) && <Thermometer size={13} className='text-white/20 flex-shrink-0' />}

      {/* Lights badge */}
      {lightsTotal > 0 && lightsOn > 0 && (
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className='flex items-center gap-1 bg-amber-500/90 rounded-full px-2 py-0.5 flex-shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
        >
          <Lightbulb size={10} className='text-white' fill='white' />
          <span className='text-[10px] font-bold text-white leading-none'>{lightsOn}</span>
        </motion.div>
      )}
      {lightsTotal > 0 && lightsOn === 0 && (
        <div className='flex items-center gap-1 bg-white/8 border border-white/10 rounded-full px-2 py-0.5 flex-shrink-0'>
          <Lightbulb size={10} className='text-white/30' />
          <span className='text-[10px] font-semibold text-white/30 leading-none'>{lightsTotal}</span>
        </div>
      )}

      {/* Temperature */}
      {temp !== null && !isNaN(temp) && (
        <span className='text-white/55 text-xs font-semibold tabular-nums flex-shrink-0 min-w-[34px] text-right'>
          <AnimatedNumber value={temp} decimals={1} suffix='°' />
        </span>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomsGrid() {
  const [selectedRoom, setSelectedRoom] = useState<RoomConfig | null>(null);
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomsGridConfig>(widgetId || 'rooms');
  const rooms = resolveRooms(config);

  return (
    <>
      <div className='gc rounded-3xl p-4 h-full'>
        <div className='text-white/50 text-xs uppercase tracking-[0.15em] mb-3 px-2 font-medium'>Pièces</div>
        <div className='flex flex-col'>
          {rooms.map((room, i) => (
            <RoomRow key={room.area} room={room} index={i} onOpen={() => setSelectedRoom(room)} />
          ))}
        </div>
      </div>

      <AnimatePresence>{selectedRoom && <RoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />}</AnimatePresence>
    </>
  );
}

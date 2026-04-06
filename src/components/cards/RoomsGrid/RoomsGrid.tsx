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
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomsGridConfig } from '@/types/widget-configs';
import { resolveIcon } from '@/lib/lucide-icon-map';

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
  { area: 'cuisine', label: 'Cuisine', Icon: UtensilsCrossed, iconBg: 'from-red-500 to-orange-400', lightEntities: ['light.bandeau_led_cuisine'], tempEntity: 'sensor.detecteur_chaleur_temperature' },
  { area: 'celier', label: 'Cellier', Icon: Package, iconBg: 'from-purple-500 to-violet-400' },
  { area: 'salle_de_sejour', label: 'Salle à manger', Icon: Armchair, iconBg: 'from-lime-500 to-green-400', tempEntity: 'sensor.temperature_pellet_temperature' },
  { area: 'chambre_invites', label: 'Ch. invités', Icon: BedDouble, iconBg: 'from-teal-500 to-cyan-400' },
  { area: 'chambre', label: 'Chambre', Icon: Moon, iconBg: 'from-pink-500 to-rose-400', tempEntity: 'sensor.temperature_chambre_temperature', lightEntities: ['light.chambre'] },
  { area: 'salon', label: 'Salon', Icon: Sofa, iconBg: 'from-yellow-500 to-amber-400', lightEntities: ['light.salon'], panelId: 'lumieres' },
  { area: 'bureau', label: 'Bureau', Icon: BriefcaseBusiness, iconBg: 'from-indigo-500 to-blue-400', tempEntity: 'sensor.ble_temperature_capteur_temperature_salon' },
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
              <div className='gc-inner flex-1 rounded-2xl p-3 flex items-center gap-2'>
                <Thermometer size={16} className='text-blue-400' />
                <div>
                  <div className='text-xs text-white/40'>Température</div>
                  <div className='text-white font-semibold'>{temp.toFixed(1)}°C</div>
                </div>
              </div>
            )}
            {humidity !== null && !isNaN(humidity) && (
              <div className='gc-inner flex-1 rounded-2xl p-3 flex items-center gap-2'>
                <Droplets size={16} className='text-cyan-400' />
                <div>
                  <div className='text-xs text-white/40'>Humidité</div>
                  <div className='text-white font-semibold'>{humidity.toFixed(0)}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lights */}
        {lights.length > 0 && (
          <div>
            <div className='text-white/40 text-xs uppercase tracking-wider mb-2'>Lumières</div>
            <div className='flex flex-col gap-2'>
              {lights.map(light => (
                <div key={light.id} className='gc-inner rounded-2xl px-4 py-3 flex items-center justify-between'>
                  <span className='text-white/80 text-sm'>{light.name}</span>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${light.on ? 'bg-yellow-400' : 'bg-white/20'}`}
                    style={light.on ? { boxShadow: '0 0 6px 2px rgba(250,204,21,0.5)' } : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open panel link */}
        {room.panelId && (
          <button
            onClick={() => {
              openPanel(room.panelId!);
              onClose();
            }}
            className='mt-4 w-full gc-inner rounded-2xl px-4 py-3 text-sm text-white/70 hover:text-white transition-colors text-center'
          >
            Voir tous les détails →
          </button>
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
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className='flex items-center gap-3 py-2.5 px-2 rounded-2xl cursor-pointer transition-colors border-b border-white/5 last:border-0'
    >
      {/* Colored icon square */}
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${room.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <room.Icon size={17} className='text-white' strokeWidth={1.8} />
      </div>

      {/* Room name */}
      <span className='text-white/90 text-sm font-medium flex-1 leading-none'>{room.label}</span>

      {/* Thermometer icon if temp exists */}
      {temp !== null && !isNaN(temp) && <Thermometer size={13} className='text-white/25 flex-shrink-0' />}

      {/* Lights badge */}
      {lightsTotal > 0 && lightsOn > 0 && (
        <div className='flex items-center gap-1 bg-amber-500/90 rounded-full px-2 py-0.5 flex-shrink-0'>
          <Lightbulb size={10} className='text-white' fill='white' />
          <span className='text-[10px] font-bold text-white leading-none'>{lightsOn}</span>
        </div>
      )}
      {lightsTotal > 0 && lightsOn === 0 && (
        <div className='flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 flex-shrink-0'>
          <Lightbulb size={10} className='text-white/30' />
          <span className='text-[10px] font-semibold text-white/30 leading-none'>{lightsTotal}</span>
        </div>
      )}

      {/* Temperature */}
      {temp !== null && !isNaN(temp) && (
        <span className='text-white/55 text-xs font-semibold tabular-nums flex-shrink-0 min-w-[34px] text-right'>{temp.toFixed(1)}°</span>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomsGrid() {
  const [selectedRoom, setSelectedRoom] = useState<RoomConfig | null>(null);
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomsGridConfig>(widgetId || 'rooms');
  const rooms = resolveRooms(config);

  return (
    <>
      <div className='gc rounded-3xl p-4 h-full'>
        <div className='text-white/50 text-xs uppercase tracking-wider mb-3 px-2 font-medium'>Pièces</div>
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

import { motion } from 'framer-motion';
import { Lightbulb, Flame, Battery, Sun, ShieldOff, ShieldCheck } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useEffect, useState } from 'react';

interface Pill {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  hideOnMobile?: boolean;
}

interface Person {
  id: string;
  name: string;
  avatar?: string;
  state?: string;
}

export function ActivityBar() {
  const entities = useHass(s => s.entities);
  const hassUrl = useHass(s => s.connection?.socket?.url);
  const [isMobile, setIsMobile] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pills: Pill[] = [];

  // Alarm
  const alarmState = entities?.['alarm_control_panel.alarmo']?.state;
  if (alarmState) {
    const isArmed = alarmState !== 'disarmed';
    pills.push({
      id: 'alarm',
      icon: isArmed ? <ShieldCheck size={14} /> : <ShieldOff size={14} />,
      label: isArmed ? 'Alarme armée' : 'Alarme désarmée',
      color: isArmed ? 'text-red-400' : 'text-green-400',
      bgColor: isArmed ? 'bg-red-400/10' : 'bg-green-400/10',
    });
  }

  // Pellet
  const pelletState = entities?.['climate.pellet']?.state;
  if (pelletState) {
    const isOn = pelletState !== 'off';
    pills.push({
      id: 'pellet',
      icon: <Flame size={14} />,
      label: isOn ? 'Poêle allumé' : 'Poêle éteint',
      color: isOn ? 'text-orange-400' : 'text-white/40',
      bgColor: isOn ? 'bg-orange-400/10' : 'bg-white/5',
    });
  }

  // Battery solar
  const battLevel = entities?.['sensor.solarflow_2400_ac_electric_level']?.state;
  if (battLevel) {
    const lvl = Number(battLevel);
    let color = 'text-green-400';
    let bgColor = 'bg-green-400/10';
    if (lvl <= 25) {
      color = 'text-red-400';
      bgColor = 'bg-red-400/10';
    } else if (lvl <= 60) {
      color = 'text-yellow-400';
      bgColor = 'bg-yellow-400/10';
    }
    pills.push({
      id: 'battery',
      icon: <Battery size={14} />,
      label: `Batterie solaire ${battLevel}%`,
      color,
      bgColor,
      hideOnMobile: true,
    });
  }

  // Tempo couleur
  const tempoCouleur = entities?.['sensor.rte_tempo_couleur_actuelle']?.state;
  if (tempoCouleur) {
    const colorMap: Record<string, { color: string; bgColor: string }> = {
      Rouge: { color: 'text-red-400', bgColor: 'bg-red-400/10' },
      Blanc: { color: 'text-white/80', bgColor: 'bg-white/10' },
      Bleu: { color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
    };
    const colorData = colorMap[tempoCouleur] ?? { color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
    pills.push({
      id: 'tempo',
      icon: <Sun size={14} />,
      label: `Tempo ${tempoCouleur}`,
      color: colorData.color,
      bgColor: colorData.bgColor,
      hideOnMobile: true,
    });
  }

  // Chambre temp
  const chambreTemp = entities?.['sensor.temperature_chambre_temperature']?.state;
  if (chambreTemp) {
    pills.push({
      id: 'chambre',
      icon: <Lightbulb size={14} />,
      label: `Chambre ${Number(chambreTemp).toFixed(1)}°C`,
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/10',
      hideOnMobile: true,
    });
  }

  // Helper to convert relative avatar paths to absolute URLs
  const getAvatarUrl = (avatarPath?: string) => {
    if (!avatarPath) return undefined;

    // If already absolute URL, return as-is
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }

    // If relative path, prepend Home Assistant URL
    if (hassUrl) {
      // Extract base URL from WebSocket URL (ws://localhost:8123 -> http://localhost:8123)
      const baseUrl = hassUrl
        .replace(/^wss?:\/\//, 'http' + (hassUrl.startsWith('wss') ? 's' : '') + '://')
        .replace(/\/api\/websocket$/, '');
      return `${baseUrl}${avatarPath}`;
    }

    return avatarPath;
  };

  // Persons (avatars)
  const persons: Person[] = [];
  Object.entries(entities ?? {}).forEach(([id, entity]) => {
    if (id.startsWith('person.')) {
      const avatarPath = entity.attributes?.entity_picture || entity.attributes?.avatar;
      persons.push({
        id,
        name: entity.attributes?.friendly_name ?? id.replace('person.', ''),
        avatar: getAvatarUrl(avatarPath),
        state: entity.state,
      });
    }
  });

  const visiblePills = pills.filter(p => !(isMobile && p.hideOnMobile));

  return (
    <div className='flex items-center justify-between w-full gap-4'>
      {/* Pills left */}
      {visiblePills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='flex gap-2 flex-wrap items-center'
        >
          {visiblePills.map((pill, i) => (
            <motion.div
              key={pill.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`${pill.bgColor} rounded-full px-3 py-1.5 flex items-center gap-2 text-xs border border-white/10 backdrop-blur-sm`}
            >
              <span className={pill.color}>{pill.icon}</span>
              <span className='text-white/90 font-medium text-xs'>{pill.label}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Avatars right (hidden on mobile) */}
      {!isMobile && persons.length > 0 && (
        <div className='flex items-center gap-2'>
          {persons.slice(0, 3).map(person => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className='relative'
              title={person.name}
            >
              {person.avatar && !failedImages.has(person.id) ? (
                <img
                  src={person.avatar}
                  alt={person.name}
                  className='w-10 h-10 rounded-full border-2 border-white/20 object-cover'
                  onError={() => setFailedImages(prev => new Set([...prev, person.id]))}
                />
              ) : (
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-xs border-2 border-white/20'>
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              {person.state && (
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white/20 ${
                    person.state === 'home' ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

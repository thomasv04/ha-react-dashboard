import { motion } from 'framer-motion';
import { DURATION_ENTRANCE, DURATION_MEDIUM } from '@/lib/motion-tokens';
import { Activity, Lightbulb, Flame, Battery, Sun, ShieldOff, ShieldCheck } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useEffect, useState, useRef, createElement } from 'react';
import { useEntities, useEntitiesByDomain } from '@/hooks/useEntities';
import { useI18n } from '@/i18n';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { useColorResolver } from '@/hooks/useColor';
import { colorAlpha } from '@/lib/color-value';
import type { ActivityBarConfig, ActivityPill } from '@/types/widget-configs';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface PillVisual {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  hideOnMobile?: boolean;
}

interface Pill extends PillVisual {
  id: string;
  entityId: string;
  state: string;
  action: NonNullable<ActivityPill['action']>;
  service?: string;
  accent?: string;
}

interface Person {
  id: string;
  name: string;
  avatar?: string;
  state?: string;
}

/**
 * Pastilles historiques : leur apparence est calculée depuis l'état, pas depuis
 * la config. Une pastille dont l'`id` n'est pas ici est rendue génériquement
 * (icône + `template` + couleur de la config).
 */
const PRESETS: Record<string, (state: string, t: Translate) => PillVisual> = {
  alarm: (state, t) => {
    const armed = state !== 'disarmed';
    return {
      icon: armed ? <ShieldCheck size={14} /> : <ShieldOff size={14} />,
      label: armed ? t('activityBar.alarmArmed') : t('activityBar.alarmDisarmed'),
      color: armed ? 'text-red-400' : 'text-green-400',
      bgColor: armed ? 'bg-red-400/10' : 'bg-green-400/10',
    };
  },
  heater: (state, t) => {
    const isOn = state !== 'off';
    return {
      icon: <Flame size={14} />,
      label: isOn ? t('activityBar.pelletOn') : t('activityBar.pelletOff'),
      color: isOn ? 'text-orange-400' : 'text-white/40',
      bgColor: isOn ? 'bg-orange-400/10' : 'bg-white/5',
    };
  },
  solar: (state, t) => {
    const lvl = Number(state);
    let color = 'text-green-400';
    let bgColor = 'bg-green-400/10';
    if (lvl <= 25) {
      color = 'text-red-400';
      bgColor = 'bg-red-400/10';
    } else if (lvl <= 60) {
      color = 'text-yellow-400';
      bgColor = 'bg-yellow-400/10';
    }
    return { icon: <Battery size={14} />, label: t('activityBar.battery', { value: state }), color, bgColor, hideOnMobile: true };
  },
  tempo: (state, t) => {
    const colorMap: Record<string, { color: string; bgColor: string }> = {
      Rouge: { color: 'text-red-400', bgColor: 'bg-red-400/10' },
      Blanc: { color: 'text-white/80', bgColor: 'bg-white/10' },
      Bleu: { color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
    };
    const colorData = colorMap[state] ?? { color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
    return { icon: <Sun size={14} />, label: t('activityBar.tempo', { value: state }), ...colorData, hideOnMobile: true };
  },
  temp: (state, t) => ({
    icon: <Lightbulb size={14} />,
    label: t('activityBar.temperature', { value: Number(state).toFixed(1) }),
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    hideOnMobile: true,
  }),
};

/** Domaine HA → fiche détail du registre `more-info`. */
const MORE_INFO_TYPES: Record<string, string> = {
  light: 'light',
  cover: 'cover',
  weather: 'weather',
  climate: 'thermostat',
  camera: 'camera',
  person: 'person',
  automation: 'automation',
};

/**
 * Domaines dont la bascule n'est pas `homeassistant.toggle`.
 * ponytail: alarm_control_panel n'y est pas — armer/désarmer demande un code,
 * ça reste une fiche détail. À câbler si le besoin arrive.
 */
const TOGGLE_SERVICES: Record<string, (state: string) => [string, string]> = {
  lock: state => ['lock', state === 'locked' ? 'unlock' : 'lock'],
  cover: state => ['cover', state === 'open' ? 'close_cover' : 'open_cover'],
};

/** `{state}` → état, `{attr.X}` → attribut X. */
function renderTemplate(template: string, state: string, attributes: Record<string, unknown> | undefined) {
  return template.replace(/\{state\}/g, state).replace(/\{attr\.([\w.]+)\}/g, (_, key: string) => String(attributes?.[key] ?? ''));
}

export function ActivityBar() {
  const { t } = useI18n();
  const hassUrl = useHass(s => s.connection?.socket?.url);
  const helpers = useHass(s => s.helpers);
  const moreInfo = useMoreInfoOptional();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ActivityBarConfig>(widgetId || 'activity');
  const resolveColor = useColorResolver();

  // La barre ne s'abonne qu'à ses propres entités : la map complète la
  // re-rendait à chaque message WebSocket de la maison entière.
  const pillEntities = useEntities([...(config?.pills?.map(p => p.entityId) ?? []), ...(config?.persons?.map(p => p.entityId) ?? [])]);
  const personEntities = useEntitiesByDomain('person');
  const entities = pillEntities as Record<string, (typeof pillEntities)[string] | undefined>;

  // Detect mobile via container width (not viewport)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setIsMobile(entry.contentRect.width < 480);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Chaque pastille n'existe que si l'utilisateur lui a assigné une entité
  // vivante : pas de repli sur des entités codées en dur.
  const pills: Pill[] = [];
  for (const p of config?.pills ?? []) {
    const entity = entities?.[p.entityId];
    if (!entity?.state) continue;
    const preset = PRESETS[p.id]?.(entity.state, t);
    // `createElement` plutôt qu'une balise JSX : une icône résolue au render
    // n'est pas un composant stable, et React le reconstruirait à chaque passe.
    const customIcon = p.icon ? resolveIcon(p.icon) : null;
    // Le `template` ne sert qu'aux pastilles sans preset : les configs
    // existantes portent toutes `template: '{state}'` par défaut et perdraient
    // sinon leurs libellés traduits.
    const generic = p.template ? renderTemplate(p.template, entity.state, entity.attributes) : entity.state;
    pills.push({
      id: p.id,
      entityId: p.entityId,
      state: entity.state,
      icon: customIcon ? createElement(customIcon, { size: 14 }) : (preset?.icon ?? <Activity size={14} />),
      // `hideLabel` : pastille icône seule, comme un badge Mushroom sans
      // `content`. Elle l'emporte sur le libellé du preset.
      label: p.hideLabel ? '' : (preset?.label ?? (p.label ? `${p.label} ${generic}` : generic)),
      color: preset?.color ?? 'text-white/80',
      bgColor: preset?.bgColor ?? 'bg-white/5',
      hideOnMobile: preset?.hideOnMobile,
      accent: resolveColor(p.color),
      action: p.action ?? 'none',
      service: p.service,
    });
  }

  const handlePillClick = (pill: Pill, e: React.MouseEvent<HTMLElement>) => {
    const domain = pill.entityId.split('.')[0];
    if (pill.action === 'more-info') {
      moreInfo?.openMoreInfo(
        widgetId || 'activity',
        MORE_INFO_TYPES[domain] ?? 'sensor',
        pill.entityId,
        e.currentTarget.getBoundingClientRect()
      );
      return;
    }
    if (!helpers) return;
    const [serviceDomain, service] =
      pill.action === 'service' ? (pill.service ?? '').split('.') : (TOGGLE_SERVICES[domain]?.(pill.state) ?? ['homeassistant', 'toggle']);
    if (!serviceDomain || !service) return;
    helpers.callService({
      domain: serviceDomain as never,
      service: service as never,
      target: { entity_id: pill.entityId },
    } as never);
  };

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

  // Persons (avatars) — filtered by config.persons when configured, else show all
  const configPersons = config?.persons;
  const persons: Person[] = [];
  if (configPersons && configPersons.length > 0) {
    configPersons.forEach(({ entityId, name }) => {
      const entity = entities?.[entityId];
      if (!entity) return;
      const avatarPath = entity.attributes?.entity_picture || entity.attributes?.avatar;
      persons.push({
        id: entityId,
        name: name || entity.attributes?.friendly_name || entityId.replace('person.', ''),
        avatar: getAvatarUrl(avatarPath),
        state: entity.state,
      });
    });
  } else {
    personEntities.forEach(entity => {
      const avatarPath = entity.attributes?.entity_picture || entity.attributes?.avatar;
      persons.push({
        id: entity.entity_id,
        name: entity.attributes?.friendly_name ?? entity.entity_id.replace('person.', ''),
        avatar: getAvatarUrl(avatarPath),
        state: entity.state,
      });
    });
  }

  const visiblePills = pills.filter(p => !(isMobile && p.hideOnMobile));

  return (
    // `h-full` + `items-center` : la case du widget est rognée aux coins
    // arrondis, une pastille collée en haut à gauche y serait coupée.
    <div ref={containerRef} className='flex items-center justify-between w-full h-full gap-4 px-1'>
      {/* Pills left */}
      {visiblePills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_ENTRANCE }}
          className='flex gap-2 flex-wrap items-center'
        >
          {visiblePills.map((pill, i) => {
            const clickable = pill.action !== 'none';
            const common = {
              initial: { opacity: 0, scale: 0.9 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: DURATION_MEDIUM, delay: i * 0.05 },
              className: `${pill.accent ? '' : pill.bgColor} rounded-full ${
                pill.label ? 'px-3 gap-2' : 'px-2'
              } py-1.5 flex items-center text-xs border border-white/10 backdrop-blur-sm${
                clickable ? ' cursor-pointer hover:border-white/25' : ''
              }`,
              style: pill.accent ? { backgroundColor: colorAlpha(pill.accent) } : undefined,
            };
            const content = (
              <>
                <span className={pill.accent ? undefined : pill.color} style={pill.accent ? { color: pill.accent } : undefined}>
                  {pill.icon}
                </span>
                {pill.label && <span className='text-white/90 font-medium text-xs'>{pill.label}</span>}
              </>
            );
            return clickable ? (
              <motion.button key={pill.id} type='button' whileTap={{ scale: 0.94 }} onClick={e => handlePillClick(pill, e)} {...common}>
                {content}
              </motion.button>
            ) : (
              <motion.div key={pill.id} {...common}>
                {content}
              </motion.div>
            );
          })}
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
              transition={{ duration: DURATION_MEDIUM }}
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

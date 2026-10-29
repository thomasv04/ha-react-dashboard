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
import { isActiveState, toggleService } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import type { ActivityBarConfig, ActivityPill } from '@/types/widget-configs';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface PillVisual {
  icon: React.ReactNode;
  label: string;
  /** Teinte de l'icône. */
  color: string;
  hideOnMobile?: boolean;
}

interface Pill extends PillVisual {
  id: string;
  entityId: string;
  state: string;
  action: NonNullable<ActivityPill['action']>;
  service?: string;
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
      icon: armed ? <ShieldCheck size={18} /> : <ShieldOff size={18} />,
      label: armed ? t('activityBar.alarmArmed') : t('activityBar.alarmDisarmed'),
      color: armed ? 'var(--ds-alert)' : 'var(--ds-good)',
    };
  },
  heater: (state, t) => {
    const isOn = state !== 'off';
    return {
      icon: <Flame size={18} />,
      label: isOn ? t('activityBar.pelletOn') : t('activityBar.pelletOff'),
      color: isOn ? 'var(--ds-heat)' : 'var(--ds-ink-muted)',
    };
  },
  solar: (state, t) => {
    const lvl = Number(state);
    const color = lvl <= 25 ? 'var(--ds-alert)' : lvl <= 60 ? 'var(--ds-warm-light)' : 'var(--ds-good)';
    return { icon: <Battery size={18} />, label: t('activityBar.battery', { value: state }), color, hideOnMobile: true };
  },
  tempo: (state, t) => ({
    icon: <Sun size={18} />,
    label: t('activityBar.tempo', { value: state }),
    color: state === 'Rouge' ? 'var(--ds-alert)' : state === 'Blanc' ? 'var(--ds-ink)' : 'var(--ds-accent)',
    hideOnMobile: true,
  }),
  temp: (state, t) => ({
    icon: <Lightbulb size={18} />,
    label: t('activityBar.temperature', { value: Number(state).toFixed(1) }),
    color: 'var(--ds-ink-muted)',
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
      icon: customIcon ? createElement(customIcon, { size: 18 }) : (preset?.icon ?? <Activity size={18} />),
      // `hideLabel` : pastille icône seule, comme un badge Mushroom sans
      // `content`. Elle l'emporte sur le libellé du preset.
      label: p.hideLabel ? '' : (preset?.label ?? (p.label ? `${p.label} ${generic}` : generic)),
      // La couleur choisie dans la config l'emporte sur celle du preset.
      color: resolveColor(p.color) ?? preset?.color ?? 'var(--ds-ink)',
      hideOnMobile: preset?.hideOnMobile,
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
      pill.action === 'service' ? (pill.service ?? '').split('.') : toggleService(domain, isActiveState(pill.state));
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
      {visiblePills.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          {visiblePills.map(pill => {
            const className = cn(
              'flex h-11 items-center rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] text-[15px] font-semibold text-[var(--ds-ink)]',
              pill.label ? 'gap-2 px-4' : 'px-3'
            );
            const content = (
              <>
                <span aria-hidden='true' style={{ color: pill.color }}>
                  {pill.icon}
                </span>
                {pill.label && <span>{pill.label}</span>}
              </>
            );
            return pill.action !== 'none' ? (
              <button key={pill.id} type='button' onClick={e => handlePillClick(pill, e)} className={cn(className, 'active:scale-95')}>
                {content}
              </button>
            ) : (
              <div key={pill.id} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      )}

      {/* Les personnes à droite, masquées quand la place manque */}
      {!isMobile && persons.length > 0 && (
        <div className='flex items-center gap-2'>
          {persons.slice(0, 3).map(person => (
            <div key={person.id} className='relative' title={person.name}>
              {person.avatar && !failedImages.has(person.id) ? (
                <img
                  src={person.avatar}
                  alt={person.name}
                  className='size-11 rounded-full object-cover'
                  onError={() => setFailedImages(prev => new Set([...prev, person.id]))}
                />
              ) : (
                <div className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-sm font-semibold text-[var(--ds-ink)]'>
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              {person.state && (
                <div
                  className={cn(
                    'absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-[var(--ds-surface-1)]',
                    person.state === 'home' ? 'bg-[var(--ds-good)]' : 'bg-[var(--ds-ink-muted)]'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

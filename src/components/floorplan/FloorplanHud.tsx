import { useState } from 'react';
import { useHass } from '@hakit/core';
import type { HassEntity } from 'home-assistant-js-websocket';
import { DoorClosed, DoorOpen, Lightbulb, Lock, LockOpen, ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from 'lucide-react';
import { useFormats } from '@/hooks/useFormats';
import { callHAService, friendlyName, toggleService } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/** Lisible sur un ciel clair comme sur un ciel de nuit. */
const ON_SKY = { textShadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 0 18px rgb(0 0 0 / 0.4)' };

/**
 * La météo écrite sur le ciel, en haut à droite, sans card : la température en
 * grand, l'état du ciel, le prochain coucher — ou lever — du soleil, le vent
 * et l'humidité.
 */
export function SkyWeather({ weather, sun }: { weather: HassEntity; sun: HassEntity | undefined }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const a = weather.attributes;
  // `partly-cloudy` : l'orthographe de quelques intégrations, pour le `partlycloudy` de HA.
  const condition =
    [weather.state, weather.state.replace(/-/g, '')]
      .map(state => t(`widgets.weather.conditions.${state}`))
      .find(text => !text.startsWith('widgets.')) ?? weather.state.replace(/[-_]/g, ' ');
  // Le soleil levé, son coucher ; couché, son lever.
  const up = sun?.state === 'above_horizon';
  const next = sun?.attributes?.[up ? 'next_setting' : 'next_rising'];
  const details = [
    typeof next === 'string' && t(up ? 'layout.floorplan.skySunset' : 'layout.floorplan.skySunrise', { time: formatTime(new Date(next)) }),
    typeof a.wind_speed === 'number' &&
      t('layout.floorplan.skyWind', { value: `${Math.round(a.wind_speed)} ${a.wind_speed_unit ?? 'km/h'}` }),
    typeof a.humidity === 'number' && t('layout.floorplan.skyHumidity', { value: Math.round(a.humidity) }),
  ].filter(Boolean);

  return (
    <div
      data-floorplan-weather
      // Un voile à peine sombre derrière le texte : sur un nuage blanc, l'ombre seule ne suffit pas.
      className='-m-6 p-6 text-right text-white pointer-events-none select-none bg-[radial-gradient(closest-side,rgb(15_23_42/0.4),transparent)]'
      style={ON_SKY}
    >
      {typeof a.temperature === 'number' && (
        <p className='text-[clamp(3rem,7cqi,5.5rem)] font-extralight leading-none tabular-nums'>{Math.round(a.temperature)}°</p>
      )}
      <p className='mt-1 text-lg font-semibold'>{condition}</p>
      {details.length > 0 && <p className='text-sm text-white/85'>{details.join(' · ')}</p>}
    </div>
  );
}

/** Une chip d'état, en haut de la maquette ; enfoncée, elle prend la couleur `on`. */
function StatusChip({
  icon: Icon,
  label,
  onClick,
  pressed,
  tone = 'text-white/60',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        'flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full gc-overlay text-sm font-medium whitespace-nowrap transition-colors',
        pressed ? 'text-white ring-1 ring-white/30' : 'text-white/85 hover:text-white'
      )}
    >
      <Icon size={15} className={cn('shrink-0', tone)} />
      {label}
    </button>
  );
}

const ALARM_ICON: Record<string, LucideIcon> = { disarmed: ShieldOff, triggered: ShieldAlert };

/**
 * Les chips d'état, en haut à gauche de la maquette : l'alarme — son mode, la
 * fenêtre de choix au toucher —, les lampes allumées — leur liste, chacune
 * basculable —, ce qui est resté ouvert — la vue sécurité au toucher.
 */
export function StatusChips({
  alarm,
  onAlarm,
  lamps,
  open,
  security,
  onSecurity,
}: {
  /** Absente : pas de chip d'alarme. */
  alarm?: HassEntity;
  onAlarm: () => void;
  /** Les lumières des lampes de la page. */
  lamps: { entityId: string; entity?: HassEntity }[];
  /** Les noms de ce qui est ouvert — `null` : rien à surveiller. */
  open: string[] | null;
  security: boolean;
  onSecurity: () => void;
}) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const [listing, setListing] = useState(false);
  const lit = lamps.filter(l => l.entity?.state === 'on');

  return (
    <>
      {alarm && (
        <StatusChip
          icon={ALARM_ICON[alarm.state] ?? ShieldCheck}
          tone={alarm.state === 'triggered' ? 'text-red-400' : alarm.state === 'disarmed' ? 'text-white/60' : 'text-green-400'}
          label={t(`widgets.alarm.${alarm.state}`).startsWith('widgets.') ? alarm.state : t(`widgets.alarm.${alarm.state}`)}
          onClick={onAlarm}
        />
      )}
      {lamps.length > 0 && (
        <div className='relative'>
          <StatusChip
            icon={Lightbulb}
            tone={lit.length ? 'text-amber-300' : 'text-white/60'}
            label={
              lit.length
                ? t(lit.length > 1 ? 'layout.floorplan.lightsOnPlural' : 'layout.floorplan.lightsOn', { count: lit.length })
                : t('layout.floorplan.lightsOff')
            }
            onClick={() => setListing(on => !on)}
            pressed={listing}
          />
          {listing && (
            <>
              {/* Un toucher ailleurs referme la liste. */}
              <div className='fixed inset-0 z-10' onClick={() => setListing(false)} />
              <ul className='absolute left-0 top-full mt-2 z-20 min-w-56 max-h-72 overflow-y-auto p-1.5 rounded-2xl gc-overlay'>
                {[...lit, ...lamps.filter(l => !lit.includes(l))].map(({ entityId, entity }) => {
                  const on = entity?.state === 'on';
                  return (
                    <li key={entityId}>
                      <button
                        onClick={() => callHAService(helpers, ...toggleService('light', on), { entity_id: entityId })}
                        aria-pressed={on}
                        className='w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-left text-white/85 hover:bg-white/8'
                      >
                        <Lightbulb size={15} className={on ? 'text-amber-300' : 'text-white/35'} />
                        <span className='flex-1 truncate'>{friendlyName(entity) ?? entityId}</span>
                        <span className={cn('text-xs', on ? 'text-amber-200' : 'text-white/40')}>{t(on ? 'common.on' : 'common.off')}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
      {open && (
        <StatusChip
          icon={open.length ? DoorOpen : DoorClosed}
          tone={open.length ? 'text-amber-300' : 'text-green-400'}
          label={
            open.length
              ? t(open.length > 1 ? 'layout.floorplan.openCountPlural' : 'layout.floorplan.openCount', { count: open.length })
              : t('layout.floorplan.securityClosed')
          }
          onClick={onSecurity}
          pressed={security}
        />
      )}
    </>
  );
}

/**
 * La serrure connectée d'une porte, posée dessus (`at`, en % du plan) : un
 * cadenas fermé, ou ouvert et ambre quand elle est déverrouillée — rouge,
 * bloquée. Au toucher, son état et de quoi la basculer : deux gestes, jamais
 * une porte déverrouillée d'un doigt qui passait.
 */
export function LockBadge({ entityId, entity, at }: { entityId: string; entity?: HassEntity; at: { x: number; y: number } }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const [asking, setAsking] = useState(false);
  const state = entity?.state ?? 'unavailable';
  const locked = state === 'locked';
  const label = t(`widgets.lock.${state}`).startsWith('widgets.') ? state : t(`widgets.lock.${state}`);
  const name = friendlyName(entity) ?? entityId;
  return (
    <div data-floorplan-lock={entityId} className='absolute z-10' style={{ left: `${at.x}%`, top: `${at.y}%`, translate: '-50% -50%' }}>
      <button
        onClick={e => {
          e.stopPropagation();
          setAsking(on => !on);
        }}
        title={`${name} · ${label}`}
        aria-label={`${name} · ${label}`}
        aria-expanded={asking}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full gc-overlay shadow-lg',
          state === 'jammed' ? 'text-red-400 ring-2 ring-red-400/60' : locked ? 'text-white/80' : 'text-amber-300 ring-2 ring-amber-300/50'
        )}
      >
        {locked ? <Lock size={15} /> : <LockOpen size={15} />}
      </button>
      {asking && (
        <>
          <div className='fixed inset-0 z-10' onClick={() => setAsking(false)} />
          <div className='absolute left-1/2 top-full mt-2 z-20 -translate-x-1/2 w-52 flex flex-col gap-2 p-2.5 rounded-2xl gc-overlay'>
            <p className='text-sm font-medium text-white/90 truncate'>{name}</p>
            <p className={cn('text-xs', locked ? 'text-white/55' : 'text-amber-200')}>{label}</p>
            <button
              onClick={() => {
                callHAService(helpers, 'lock', locked ? 'unlock' : 'lock', { entity_id: entityId });
                setAsking(false);
              }}
              className='flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/15'
            >
              {locked ? <LockOpen size={13} /> : <Lock size={13} />}
              {t(locked ? 'layout.floorplan.lockUnlock' : 'layout.floorplan.lockLock')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

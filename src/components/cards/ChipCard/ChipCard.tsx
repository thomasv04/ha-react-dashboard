import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmSmoke,
  AppWindow,
  Battery,
  Blinds,
  CircleDot,
  DoorClosed,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Footprints,
  Lightbulb,
  Lock,
  LockOpen,
  Plug,
  Power,
  Speaker,
  Sun,
  Thermometer,
  User,
  Video,
  Wind,
  Zap,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { modalTypeFor } from '@/components/modals/more-info-registry';
import { useCardActions } from '@/hooks/useCardActions';
import { useLongPress } from '@/hooks/useLongPress';
import { useStateLabel } from '@/hooks/useStateLabel';
import { callHAService, friendlyName, isActiveState, toggleService } from '@/lib/ha-service';
import { lightColor } from '@/lib/floorplan';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconCatalog } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import type { ChipCardConfig } from '@/types/widget-configs';
import type { CardActionsConfig } from '@/types/card-actions';

// Importées nommément : passer par des noms résolus à l'exécution ferait
// télécharger tout le catalogue lucide pour une dizaine d'icônes.
const DEVICE_CLASS_ICONS: Record<string, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  moisture: Droplets,
  illuminance: Sun,
  power: Zap,
  energy: Zap,
  battery: Battery,
  carbon_dioxide: Wind,
  motion: Footprints,
  occupancy: Footprints,
  presence: Footprints,
  window: AppWindow,
  smoke: AlarmSmoke,
  heat: Flame,
  plug: Plug,
  outlet: Plug,
};

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  light: Lightbulb,
  switch: Power,
  input_boolean: Power,
  fan: Fan,
  cover: Blinds,
  climate: Thermometer,
  media_player: Speaker,
  camera: Video,
  person: User,
  device_tracker: User,
};

/** Portes et ouvrants : l'icône montre l'état. */
const OPENINGS = new Set(['door', 'garage_door', 'opening']);

function defaultIcon(domain: string, deviceClass: string | undefined, state: string | undefined): LucideIcon {
  if (deviceClass && OPENINGS.has(deviceClass)) return state === 'on' ? DoorOpen : DoorClosed;
  if (domain === 'lock') return state === 'unlocked' ? LockOpen : Lock;
  return (deviceClass && DEVICE_CLASS_ICONS[deviceClass]) || DOMAIN_ICONS[domain] || CircleDot;
}

/** Ce qu'un tap bascule. Le reste — capteurs surtout — ouvre sa fiche. */
const TOGGLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean', 'cover', 'lock']);

/** La couleur « allumé » du reste du dashboard. */
const ACTIVE_COLOR = '#fbbf24';

/**
 * L'état d'une entité, en une pastille.
 *
 * Tout se déduit de l'entité : icône selon la `device_class`, libellé tel que
 * HA l'écrit (« Détecté », « Ouverte », « 21,5 °C »), couleur réelle d'une
 * lampe allumée. Sur une page plan, on la pose sur la pièce concernée.
 */
export function ChipCard() {
  useIconCatalog();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  // Les actions sont communes à toutes les cards : elles ne figurent pas dans
  // l'interface propre à chacune.
  const config = getWidgetConfig<ChipCardConfig>(widgetId || 'chip') as (ChipCardConfig & CardActionsConfig) | undefined;
  const entityId = config?.entityId ?? '';

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const formatter = useHass(s => s.formatter);
  const runAction = useCardActions();
  const moreInfo = useMoreInfoOptional();
  const ref = useRef<HTMLButtonElement>(null);
  const held = useRef(false);

  const domain = entityId.split('.')[0];
  const state = entity?.state;
  const deviceClass = entity?.attributes.device_class as string | undefined;
  const haLabel = useStateLabel(entityId, state, deviceClass);

  const openMoreInfo = () => {
    if (entityId) moreInfo?.openMoreInfo(entityId, modalTypeFor(entityId), entityId, ref.current?.getBoundingClientRect());
  };

  const { handlers: longPress, moved } = useLongPress(() => {
    held.current = true;
    const hold = config?.holdAction;
    // `more-info` n'est pas joué par `runAction` : la fiche s'anime depuis le
    // cadre de la pastille, que lui seul ne connaît pas.
    if (hold?.action !== 'more-info' && runAction(hold, entityId)) return;
    openMoreInfo();
  });

  const handleClick = (e: React.MouseEvent) => {
    // La pastille garde ses gestes : sans ça, la case qui l'entoure jouerait
    // aussi les siens, et un appui long ouvrirait deux fiches.
    e.stopPropagation();
    // L'appui long et le glissement finissent tous deux par un `click`.
    if (held.current || moved.current) return;
    const tap = config?.tapAction;
    if (tap?.action === 'more-info') return openMoreInfo();
    if (runAction(tap, entityId)) return;
    if (state && TOGGLE_DOMAINS.has(domain)) {
      const [serviceDomain, service] = toggleService(domain, isActiveState(state));
      callHAService(helpers, serviceDomain, service, { entity_id: entityId });
    } else {
      openMoreInfo();
    }
  };

  const unit = entity?.attributes.unit_of_measurement as string | undefined;
  let label = haLabel;
  if (!label && entity) {
    try {
      // Nombres et unités : @hakit applique la précision d'affichage réglée dans HA.
      // `''` tant que sa configuration n'est pas chargée.
      label = formatter?.stateValue({ entity_id: entityId, ...entity } as never) || undefined;
    } catch {
      // Repli juste en dessous.
    }
  }
  label ??= state === undefined ? '—' : unit ? `${state} ${unit}` : state;

  const unavailable = !entity || state === 'unavailable' || state === 'unknown';
  // Un capteur n'est ni « allumé » ni « éteint » : sa valeur n'a pas à se colorer.
  const active = !unavailable && domain !== 'sensor' && isActiveState(state);
  const lamp = domain === 'light' ? lightColor(state, entity?.attributes) : null;
  const iconColor = active ? (lamp ? `rgb(${lamp.join(',')})` : ACTIVE_COLOR) : 'rgba(255,255,255,0.5)';

  const customIconUrl = config?.icon && isCustomIcon(config.icon) ? getCustomIconUrl(config.icon) : undefined;
  const Icon = customIconUrl ? null : (resolveIcon(config?.icon) ?? defaultIcon(domain, deviceClass, state));

  const title = `${config?.name || friendlyName(entity) || entityId} : ${label}`;

  return (
    <div className='h-full flex items-center justify-center'>
      <button
        ref={ref}
        type='button'
        title={title}
        aria-label={title}
        onClick={handleClick}
        {...longPress}
        onPointerDown={e => {
          e.stopPropagation();
          held.current = false;
          longPress.onPointerDown(e);
        }}
        className={cn(
          'gc flex items-center gap-[0.4em] px-[0.75em] py-[0.35em] whitespace-nowrap select-none cursor-pointer',
          unavailable && 'opacity-45'
        )}
        // `cqi` : sur un plan, le texte suit la largeur du plan dans des bornes lisibles.
        style={{ borderRadius: 9999, fontSize: 'clamp(11px, 0.85cqi, 15px)' }}
      >
        {customIconUrl ? (
          <img src={customIconUrl} alt='' className='object-contain' style={{ width: '1.15em', height: '1.15em' }} />
        ) : Icon ? (
          // eslint-disable-next-line react-hooks/static-components
          <Icon size='1.15em' style={{ color: iconColor }} />
        ) : null}
        {config?.name && <span className='text-white/55 font-medium'>{config.name}</span>}
        <span className='text-white/90 font-semibold tabular-nums'>{label}</span>
      </button>
    </div>
  );
}

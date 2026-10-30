import { useRef } from 'react';
import { Lightbulb, ChevronRight, Package } from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useEntities } from '@/hooks/useEntities';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomCardConfig, RoomControl } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useGroupEmbedded } from '@/components/cards/GroupCard/GroupCard';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useControlState } from '@/hooks/useControlState';
import { useLongPress } from '@/hooks/useLongPress';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { modalTypeFor } from '@/components/modals/more-info-registry';
import { useArea, useAreaControls, areaEntityIds, areaSensor } from '@/hooks/useAreaControls';
import type { SoundPreset } from '@/lib/sounds';

// ── Control button ─────────────────────────────────────────────────────────────

function ControlButton({
  ctrl,
  embedded,
  soundOverrides,
}: {
  ctrl: RoomControl;
  embedded?: boolean;
  soundOverrides?: Record<string, SoundPreset>;
}) {
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback('rooms', soundOverrides);

  const iconName = ctrl.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;

  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? Package) : null;

  const { active } = useControlState(ctrl);

  // Appui long : la fiche de l'entité pilotée. Un bouton de domaine en pilote
  // plusieurs — ponytail: on ouvre la première, faute d'une fiche « groupe ».
  const moreInfo = useMoreInfoOptional();
  const btnRef = useRef<HTMLButtonElement>(null);
  const held = useRef(false);
  const targetIds = ctrl.entityIds?.length ? ctrl.entityIds : ctrl.entityId ? [ctrl.entityId] : [];
  const { handlers: longPress } = useLongPress(() => {
    if (!moreInfo || !targetIds.length) return;
    held.current = true;
    moreInfo.openMoreInfo(targetIds[0], modalTypeFor(targetIds[0]), targetIds[0], btnRef.current?.getBoundingClientRect());
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // L'appui long finit par un `click` : il ne doit pas piloter en plus d'ouvrir.
    if (held.current) return;
    helpers.callService({
      domain: ctrl.domain as never,
      service: ctrl.service as never,
      target: targetIds.length ? { entity_id: targetIds } : undefined,
    } as never);
    playFeedback('room_tap');
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      {...longPress}
      onPointerDown={e => {
        // La card entière peut avoir son propre appui long : deux fiches
        // s'ouvriraient. Le bouton garde le geste pour lui.
        e.stopPropagation();
        held.current = false;
        longPress.onPointerDown(e);
      }}
      title={ctrl.label}
      aria-pressed={active}
      className={cn(
        'flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--ds-radius-md)] px-1 text-sm font-semibold transition-colors',
        active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]',
        embedded && 'min-h-[52px]'
      )}
    >
      {customIconUrl ? (
        <img src={customIconUrl} alt='' className='size-5 object-contain' />
      ) : IconComp ? (
        // eslint-disable-next-line react-hooks/static-components
        <IconComp size={20} aria-hidden='true' />
      ) : null}
      <span className='max-w-full truncate px-1'>{ctrl.label}</span>
    </button>
  );
}

// ── Default light toggle ───────────────────────────────────────────────────────

function LightToggle({
  entityIds,
  embedded,
  soundOverrides,
}: {
  entityIds: string[];
  embedded?: boolean;
  soundOverrides?: Record<string, SoundPreset>;
}) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback('rooms', soundOverrides);
  const entities = useEntities(entityIds);
  const anyOn = entityIds.some(id => entities?.[id]?.state === 'on');

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    entityIds.forEach(id => {
      helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: id } });
    });
    playFeedback(anyOn ? 'light_off' : 'light_on');
  };

  return (
    <button
      onClick={handleToggleAll}
      aria-pressed={anyOn}
      className={cn(
        'flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--ds-radius-md)] px-1 text-sm font-semibold transition-colors',
        anyOn ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]',
        embedded && 'min-h-[52px]'
      )}
    >
      <Lightbulb size={20} aria-hidden='true' fill={anyOn ? 'currentColor' : 'none'} />
      <span>{anyOn ? t('widgets.light.on') : t('widgets.light.off')}</span>
    </button>
  );
}

// ── Main RoomCard ──────────────────────────────────────────────────────────────

export function RoomCard() {
  const { language } = useI18n();
  const embedded = useGroupEmbedded();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomCardConfig>(widgetId || 'room');
  const { openPanel } = usePanel();

  const iconName = config?.icon ?? 'Home';
  const panelId = config?.panelId;

  // Zone HA : tout ce que la card affiche en découle, et les champs de
  // l'éditeur ne sont que des surcharges. Une entité ajoutée à la zone dans
  // Home Assistant apparaît ici sans que personne ait à revenir la désigner.
  const area = useArea(config?.area);
  const label = config?.label || area?.name || 'Pièce';
  const areaControls = useAreaControls(config?.area, config?.areaControls);
  const controls = [...areaControls, ...(config?.controls ?? [])];

  // Pas de `useMemo` : le compilateur React s'en charge, et sa mémoïsation
  // manuelle est justement ce qu'il refuse de préserver ici.
  const lightEntities = config?.lightEntities?.length ? config.lightEntities : areaEntityIds(area, 'light');

  const tempEntity = config?.tempEntity || area?.temperature_entity_id || areaSensor(area, 'temperature');
  const humidityEntity = config?.humidityEntity || area?.humidity_entity_id || areaSensor(area, 'humidity');

  const sensorIds = [tempEntity, humidityEntity].filter(Boolean) as string[];
  const sensors = useEntities(sensorIds);

  const rawTemp = tempEntity ? sensors?.[tempEntity]?.state : undefined;
  const temp = rawTemp && rawTemp !== 'unavailable' ? Number(rawTemp) : null;

  const rawHumidity = humidityEntity ? sensors?.[humidityEntity]?.state : undefined;
  const humidity = rawHumidity && rawHumidity !== 'unavailable' ? Number(rawHumidity) : null;

  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? Package) : null;

  const hasControls = controls.length > 0 || lightEntities.length > 0;

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panelId) openPanel(panelId as PanelId);
  };

  const facts = [
    temp !== null && !isNaN(temp) ? `${temp.toLocaleString(language, { maximumFractionDigits: 1 })}°` : null,
    humidity !== null && !isNaN(humidity) ? `${humidity.toFixed(0)} %` : null,
  ].filter(Boolean);

  return (
    // Le geste s'arrête à la card : elle n'agit que par ses boutons. Sans ça, un
    // clic à côté d'un bouton déclenchait l'action de card, et un appui long
    // ouvrait deux fiches — celle du bouton visé et celle de la card.
    <div
      className={cn(
        'flex h-full cursor-default flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] text-[var(--ds-ink)]',
        embedded ? 'bg-[var(--ds-surface-2)] p-3' : 'bg-[var(--ds-surface-2)] p-[var(--ds-space-4)]'
      )}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* En-tête : le nom de la pièce en grand, ses mesures dessous */}
      <div className='flex items-start gap-3'>
        {customIconUrl ? (
          <img src={customIconUrl} alt='' className='mt-1 size-6 shrink-0 object-contain' />
        ) : IconComp ? (
          // eslint-disable-next-line react-hooks/static-components
          <IconComp size={24} aria-hidden='true' className='mt-1 shrink-0 text-[var(--ds-accent)]' />
        ) : null}
        <div className='min-w-0 flex-1'>
          <div className={cn('truncate leading-tight text-[var(--ds-accent)]', embedded ? 'text-xl' : 'text-[28px]')}>{label}</div>
          {facts.length > 0 && <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{facts.join(' · ')}</div>}
        </div>
        {panelId && (
          <button
            onClick={handlePanelClick}
            aria-label={label}
            className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {hasControls && (
        <div className='mt-auto flex gap-2'>
          {lightEntities.length > 0 && controls.length === 0 && (
            <LightToggle entityIds={lightEntities} embedded={embedded} soundOverrides={config?.soundOverrides} />
          )}
          {controls.map((ctrl, i) => (
            <ControlButton key={i} ctrl={ctrl} embedded={embedded} soundOverrides={config?.soundOverrides} />
          ))}
        </div>
      )}
    </div>
  );
}

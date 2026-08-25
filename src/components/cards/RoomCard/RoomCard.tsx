import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Lightbulb, Droplets, ChevronRight, Package } from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useEntities } from '@/hooks/useEntities';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomCardConfig, RoomControl } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useGroupEmbedded } from '@/components/cards/GroupCard/GroupCard';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useControlState } from '@/hooks/useControlState';
import { useLongPress } from '@/hooks/useLongPress';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { modalTypeFor } from '@/components/modals/more-info-registry';
import { useArea, useAreaControls, areaEntityIds, areaSensor } from '@/hooks/useAreaControls';
import { gradientCss } from '@/lib/gradient';
import { colorAlpha } from '@/lib/color-value';
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

  const { color, active } = useControlState(ctrl);

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
    <motion.button
      ref={btnRef}
      whileHover={{
        scale: 1.04,
        backgroundColor: active ? colorAlpha(color, 16) : 'rgba(255,255,255,0.10)',
        borderColor: active ? colorAlpha(color, 30) : 'rgba(255,255,255,0.18)',
      }}
      whileTap={{ scale: 0.88 }}
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
      className='flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border cursor-pointer transition-colors duration-300'
      style={{
        padding: embedded ? '6px 4px' : '8px 4px',
        ...(active
          ? { background: colorAlpha(color, 9), borderColor: colorAlpha(color, 19) }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }),
      }}
    >
      {customIconUrl ? (
        <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
      ) : IconComp ? (
        // eslint-disable-next-line react-hooks/static-components
        <IconComp size={embedded ? 14 : 16} style={active ? { color } : { color: 'rgba(255,255,255,0.35)' }} />
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
    <motion.button
      whileHover={{
        scale: 1.04,
        backgroundColor: anyOn ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.10)',
        borderColor: anyOn ? 'rgba(251,191,36,0.40)' : 'rgba(255,255,255,0.18)',
      }}
      whileTap={{ scale: 0.88 }}
      onClick={handleToggleAll}
      className='flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border cursor-pointer transition-colors duration-300'
      style={{
        padding: embedded ? '6px 4px' : '8px 4px',
        ...(anyOn
          ? { background: 'rgba(251,191,36,0.14)', borderColor: 'rgba(251,191,36,0.28)' }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }),
      }}
    >
      <Lightbulb size={embedded ? 14 : 16} style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }} />
      <span className='text-[9px] font-medium leading-none' style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }}>
        {anyOn ? t('widgets.light.on') : t('widgets.light.off')}
      </span>
    </motion.button>
  );
}

// ── Main RoomCard ──────────────────────────────────────────────────────────────

export function RoomCard() {
  const embedded = useGroupEmbedded();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomCardConfig>(widgetId || 'room');
  const { openPanel } = usePanel();

  const iconName = config?.icon ?? 'Home';
  const iconBg = config?.iconBg ?? 'from-blue-500 to-sky-400';
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

  // When embedded inside a GroupCard, we strip the gc class (no double glassmorphism)
  const baseClass = embedded
    ? 'rounded-2xl flex flex-col overflow-hidden h-full cursor-default'
    : 'gc rounded-2xl flex flex-col overflow-hidden h-full cursor-default';

  const bgStyle = embedded ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' } : undefined;

  return (
    // Le geste s'arrête à la card : elle n'agit que par ses boutons. Sans ça, un
    // clic à côté d'un bouton déclenchait l'action de card, et un appui long
    // ouvrait deux fiches — celle du bouton visé et celle de la card.
    <div className={baseClass} style={bgStyle} onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      {/* Header */}
      <div className={cn('flex items-start gap-2.5', embedded ? 'p-2.5' : 'p-3')}>
        {/* Icon */}
        {/* `background` en style quand la valeur est connue : les classes
            Tailwind ne couvrent que les dégradés écrits dans les sources, pas
            un dégradé composé à la main. `iconBg` reste en classe pour les
            anciennes configurations qu'on ne sait pas relire. */}
        <div
          className={cn(
            'rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br',
            !gradientCss(iconBg) && iconBg,
            embedded ? 'w-8 h-8' : 'w-9 h-9'
          )}
          style={{ backgroundImage: gradientCss(iconBg) }}
        >
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
          ) : IconComp ? (
            // eslint-disable-next-line react-hooks/static-components
            <IconComp size={embedded ? 15 : 17} className='text-white' strokeWidth={1.8} />
          ) : null}
        </div>

        {/* Name + sensors */}
        <div className='flex flex-col min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-1'>
            <span className={cn('text-white/90 font-semibold leading-tight truncate', embedded ? 'text-xs' : 'text-sm')}>{label}</span>
            {panelId && (
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
          {(temp !== null || humidity !== null) && (
            <div className='flex items-center gap-2 mt-0.5'>
              {temp !== null && !isNaN(temp) && (
                <span className='text-[10px] text-white/45 font-medium flex items-center gap-0.5'>
                  <Thermometer size={9} className='text-white/25' />
                  <AnimatedNumber value={temp} decimals={1} suffix='°' />
                </span>
              )}
              {humidity !== null && !isNaN(humidity) && (
                <span className='text-[10px] text-white/45 font-medium flex items-center gap-0.5'>
                  <Droplets size={9} className='text-sky-400/50' />
                  {humidity.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {hasControls && (
        <div className={cn('flex gap-1.5 mt-auto', embedded ? 'px-2.5 pb-2.5' : 'px-3 pb-3')}>
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

import { useState, useRef, useEffect } from 'react';
import { Lightbulb, MoreVertical } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { LightCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { resolveIcon, isCustomIcon } from '@/lib/lucide-icon-map';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { friendlyName } from '@/lib/ha-service';
import { DeviceTile } from '@/components/ds/DeviceTile';
import { PillSlider } from '@/components/ds/PillSlider';
import { COLOR_TEMP_TRACK, HUE_TRACK, TRACK_MARKER } from '@/components/ds/light-tracks';
import { SheetSection } from '@/components/modals/sidebar';
import { Sheet } from '@/components/ds/Sheet';

/** Convert HA color_temp (mireds) to a 0-100 slider value (warm=0, cool=100) */
function miredsToSlider(mireds: number, min: number, max: number): number {
  return Math.round(((max - mireds) / (max - min)) * 100);
}
function sliderToKelvin(pct: number, minMireds: number, maxMireds: number): number {
  // pct=0 → warmest (maxMireds), pct=100 → coolest (minMireds)
  const mireds = Math.round(maxMireds - (pct / 100) * (maxMireds - minMireds));
  return Math.round(1_000_000 / mireds);
}

/** Convert [r,g,b] 0-255 to hsl */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

const COLOR_WHEEL = 'conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)';

export function LightCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<LightCardConfig>(widgetId || 'light');
  const entityId = config?.entityId ?? 'light.salon';

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);

  // Local state for sliders
  const haBrightness = entity?.attributes.brightness as number | undefined;
  const haColorTemp = entity?.attributes.color_temp as number | undefined;
  const haRgb = entity?.attributes.rgb_color as [number, number, number] | undefined;
  const minMireds = (entity?.attributes.min_mireds as number | undefined) ?? 153;
  const maxMireds = (entity?.attributes.max_mireds as number | undefined) ?? 500;

  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null); // 0-100 slider
  const [localHue, setLocalHue] = useState<number | null>(null); // 0-360
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setLocalBrightness(null);
  }, [haBrightness]);
  useEffect(() => {
    setLocalColorTemp(null);
  }, [haColorTemp]);
  useEffect(() => {
    setLocalHue(null);
  }, [haRgb]);

  const sendBrightness = useDebouncedCallback((pct: number) => {
    helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData: { brightness_pct: pct } });
  }, 150);

  const sendColorTemp = useDebouncedCallback((kelvin: number) => {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { color_temp_kelvin: kelvin },
    });
  }, 150);

  const sendColor = useDebouncedCallback((hue: number) => {
    helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData: { hs_color: [hue, 100] } });
  }, 150);

  const playFeedback = useSoundFeedback();

  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);

  if (!entity) {
    return (
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Lightbulb} text={t('widgets.light.notFound')} />
      </div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const currentBrightness = localBrightness ?? (haBrightness != null ? Math.round((haBrightness / 255) * 100) : 0);
  const colorModes = entity.attributes.supported_color_modes as string[] | undefined;
  const isDimmable = colorModes ? colorModes.some(m => !['onoff'].includes(m)) : haBrightness !== undefined;
  const supportsColorTemp = colorModes?.some(m => ['color_temp', 'xy', 'hs', 'rgbw', 'rgbww'].includes(m)) ?? haColorTemp !== undefined;
  const supportsColor = colorModes?.some(m => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)) ?? haRgb !== undefined;

  // Which controls to show based on config flags
  const showBrightness = (config?.showBrightness ?? true) && isDimmable;
  const showColorTemp = (config?.showColorTemp ?? true) && supportsColorTemp;
  const showColor = (config?.showColor ?? true) && supportsColor;

  const colorTempSlider = localColorTemp ?? (haColorTemp != null ? miredsToSlider(haColorTemp, minMireds, maxMireds) : 50);
  const currentHue = localHue ?? (haRgb != null ? rgbToHsl(...haRgb)[0] : 0);

  // La pilule prend la couleur de la lampe quand elle en a une, sinon le blanc chaud.
  const lampColor = haRgb ? `rgb(${haRgb.join(', ')})` : 'var(--ds-warm-light)';

  // Icône choisie par l'utilisateur : une icône Lucide, sinon l'ampoule (une
  // image téléversée ne se colore pas dans la pilule).
  const iconName = config?.icon;
  const Icon = (iconName && !isCustomIcon(iconName) ? resolveIcon(iconName) : undefined) ?? Lightbulb;

  const handleToggle = () => {
    helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const handleBrightness = (pct: number) => {
    setLocalBrightness(pct);
    sendBrightness(pct);
  };

  const stateLabel = isOn
    ? isDimmable
      ? `${t('widgets.light.on')} · ${currentBrightness} %`
      : t('widgets.light.on')
    : t('widgets.light.off');
  const hasColorSettings = showColorTemp || showColor;

  const colorSheet = hasColorSettings && (
    <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={name} subtitle={stateLabel} closeLabel={t('common.close')}>
      {showBrightness && (
        <SheetSection title={t('widgets.light.brightness')}>
          <PillSlider
            value={currentBrightness}
            min={1}
            onChange={handleBrightness}
            label={t('widgets.light.brightness')}
            valueText={`${currentBrightness} %`}
            icon={Icon}
            fill={lampColor}
            iconColor='var(--ds-warm-light-ink)'
          />
        </SheetSection>
      )}
      {showColorTemp && (
        <SheetSection title={t('widgets.light.colorTemp')}>
          <PillSlider
            value={colorTempSlider}
            onChange={pct => {
              setLocalColorTemp(pct);
              sendColorTemp(sliderToKelvin(pct, minMireds, maxMireds));
            }}
            label={t('widgets.light.colorTemp')}
            valueText={colorTempSlider < 50 ? t('widgets.light.warm') : t('widgets.light.cold')}
            track={COLOR_TEMP_TRACK}
            fill={TRACK_MARKER}
          />
        </SheetSection>
      )}
      {showColor && (
        <SheetSection title={t('widgets.light.color')}>
          <PillSlider
            value={currentHue}
            max={359}
            onChange={hue => {
              setLocalHue(hue);
              sendColor(hue);
            }}
            label={t('widgets.light.color')}
            valueText={`${currentHue}°`}
            track={HUE_TRACK}
            fill={TRACK_MARKER}
          />
        </SheetSection>
      )}
    </Sheet>
  );

  // Une rangée, ou lampe sans variateur : une tuile simple, l'appui bascule.
  if (widgetSize.squat || !showBrightness) {
    return (
      <div ref={cardRef} className='h-full'>
        <DeviceTile
          name={name}
          state={stateLabel}
          icon={Icon}
          active={isOn}
          onToggle={handleToggle}
          layout={widgetSize.squat ? 'row' : 'stack'}
          onMore={hasColorSettings ? () => setSheetOpen(true) : undefined}
          moreLabel={t('widgets.light.color')}
        />
        {colorSheet}
      </div>
    );
  }

  // La pilule verticale : on la fait glisser pour la luminosité, l'en-tête
  // bascule la lampe. Éteinte, la pilule reste visible et la faire glisser
  // rallume (`light.turn_on` porte déjà la valeur).
  return (
    <div
      ref={cardRef}
      className='relative flex h-full select-none flex-col items-center gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'
    >
      <div className='flex w-full items-start gap-1'>
        <button onClick={handleToggle} aria-pressed={isOn} className='min-w-0 flex-1 text-left'>
          <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>
          <span className={cn('block truncate text-sm', isOn ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}>
            {stateLabel}
          </span>
        </button>
        {hasColorSettings && (
          <button
            onClick={() => setSheetOpen(true)}
            aria-label={t('widgets.light.color')}
            title={t('widgets.light.color')}
            className='-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
          >
            <MoreVertical size={18} />
          </button>
        )}
      </div>

      <PillSlider
        orientation='vertical'
        value={isOn ? currentBrightness : 0}
        min={0}
        onChange={handleBrightness}
        label={t('widgets.light.brightness')}
        valueText={`${currentBrightness} %`}
        icon={Icon}
        fill={lampColor}
        iconColor='var(--ds-warm-light-ink)'
        className='min-h-0 flex-1 w-[min(110px,60%)]'
      />

      {showColor && !widgetSize.compact && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label={t('widgets.light.color')}
          title={t('widgets.light.color')}
          className='absolute bottom-3 right-3 size-8 rounded-full'
          style={{ background: COLOR_WHEEL }}
        />
      )}
      {colorSheet}
    </div>
  );
}

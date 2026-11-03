import { useMemo } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { useHass } from '@hakit/core';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/** Les teintes proposées d'un toucher, avant le curseur. */
export const SWATCHES = [300, 350, 15, 35, 325, 95, 45, 130];

/** Ce que sait faire une lumière, et où elle en est — lu dans ses attributs. */
export function lightState(entity: Pick<HassEntity, 'state' | 'attributes'>) {
  const a = entity.attributes;
  const colorModes = (a.supported_color_modes as string[] | undefined) ?? [];
  const brightness = a.brightness as number | undefined;
  const hsColor = a.hs_color as [number, number] | undefined;
  return {
    isOn: entity.state === 'on',
    dimmable: colorModes.some(m => m !== 'onoff'),
    color: colorModes.some(m => ['hs', 'rgb', 'xy'].includes(m)),
    colorTemp: colorModes.includes('color_temp'),
    brightness,
    brightnessPct: brightness != null ? Math.round((brightness / 255) * 100) : 0,
    kelvin: a.color_temp_kelvin as number | undefined,
    minKelvin: (a.min_color_temp_kelvin as number | undefined) ?? 2700,
    maxKelvin: (a.max_color_temp_kelvin as number | undefined) ?? 6500,
    hsColor,
    hue: Math.round(hsColor?.[0] ?? 0),
  };
}

/** Les services d'une lumière : la fiche et le popover du plan en partagent les appels. */
export function useLightActions(entityId: string) {
  const helpers = useHass(s => s.helpers);
  return useMemo(() => {
    const turnOn = (serviceData: Record<string, unknown>) =>
      helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData });
    return {
      toggle: () => helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: entityId } }),
      brightness: (pct: number) => turnOn({ brightness_pct: pct }),
      hue: (hue: number) => turnOn({ hs_color: [hue, 100] }),
      kelvin: (kelvin: number) => turnOn({ color_temp_kelvin: kelvin }),
    };
  }, [helpers, entityId]);
}

/** La rangée de pastilles de couleur — la teinte en cours cerclée. */
export function LightSwatches({
  hue,
  isOn,
  onPick,
  ring = 'var(--ds-sheet-section)',
  className,
}: {
  hue: number;
  isOn: boolean;
  onPick: (hue: number) => void;
  /** Le fond derrière les pastilles : l'anneau de la teinte choisie s'en détache. */
  ring?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-wrap justify-center gap-3.5', className)}>
      {SWATCHES.map(h => {
        const picked = isOn && Math.abs(hue - h) < 3;
        return (
          <button
            key={h}
            type='button'
            onClick={() => onPick(h)}
            aria-label={t('widgets.light.swatch', { value: h })}
            aria-pressed={picked}
            className='size-11 shrink-0 rounded-full'
            style={{
              background: `hsl(${h} 85% 55%)`,
              boxShadow: picked ? `0 0 0 3px ${ring}, 0 0 0 6px var(--ds-ink)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { LightCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

// ── Debounce helper (200ms) ───────────────────────────────────────────────────
function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): T {
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    }) as T,
    [fn, delay],
  );
}

export function LightCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<LightCardConfig>(widgetId || 'light');
  const entityId = config?.entityId ?? 'light.salon';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  // Brightness : état local optimiste + sync depuis HA
  const haBrightness = entity?.attributes.brightness as number | undefined;
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);

  // Sync quand HA met à jour (reset le local)
  useEffect(() => {
    setLocalBrightness(null);
  }, [haBrightness]);

  // Brightness change (debounced → service call)
  // ⚠️ Must be before any early return to respect Rules of Hooks
  const sendBrightness = useDebouncedCallback((pct: number) => {
    helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData: { brightness_pct: pct } });
  }, 200);

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-5 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Lumière introuvable</span>
      </motion.div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;

  // Brightness : 0-255 en HA → 0-100% pour l'affichage
  const currentBrightness = localBrightness ?? (haBrightness != null ? Math.round((haBrightness / 255) * 100) : 0);

  // Détection si la lumière supporte le dimming
  const colorModes = entity.attributes.supported_color_modes as string[] | undefined;
  const isDimmable = colorModes
    ? colorModes.some(m => m !== 'onoff')
    : haBrightness !== undefined;

  // Toggle on/off
  const handleToggle = () => {
    helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: entityId } });
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseInt(e.target.value, 10);
    setLocalBrightness(pct);
    sendBrightness(pct);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'gc rounded-3xl p-5 flex flex-col justify-between h-full',
        isOn && 'ring-1 ring-amber-400/20',
      )}
    >
      {/* Header : icône + toggle */}
      <div className="flex items-start justify-between">
        <button
          onClick={handleToggle}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isOn ? 'bg-amber-400/20' : 'bg-white/5 hover:bg-white/10',
          )}
        >
          <Lightbulb
            size={20}
            className={cn(
              'transition-colors',
              isOn ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-white/40',
            )}
          />
        </button>

        {/* Badge ON/OFF */}
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full',
            isOn ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 text-white/30',
          )}
        >
          {isOn ? `${currentBrightness}%` : 'OFF'}
        </span>
      </div>

      {/* Slider de luminosité */}
      {isDimmable && isOn && (
        <div className="mt-3">
          <input
            type="range"
            min={1}
            max={100}
            value={currentBrightness}
            onChange={handleBrightnessChange}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer
              bg-white/10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-amber-400
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.4)]"
            style={{
              background: `linear-gradient(to right, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0.5) ${currentBrightness}%, rgba(255,255,255,0.1) ${currentBrightness}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>
      )}

      {/* Nom */}
      <div className="mt-auto pt-3">
        <div className="text-white/40 text-xs uppercase tracking-wider">{name}</div>
      </div>
    </motion.div>
  );
}

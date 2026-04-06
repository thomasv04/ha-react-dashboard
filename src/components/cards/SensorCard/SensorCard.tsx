import { motion } from 'framer-motion';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { SensorCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { Power } from 'lucide-react';
import { useHass } from '@hakit/core';

// ── Domaine → icône par défaut ────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, string> = {
  sensor: 'Activity',
  binary_sensor: 'CircleDot',
  switch: 'ToggleRight',
  input_boolean: 'ToggleRight',
  light: 'Lightbulb',
  script: 'Play',
  scene: 'Theater',
  automation: 'Zap',
};

// ── Domaines "actionnables" (toggle) ──────────────────────────────────────────
const TOGGLEABLE = new Set(['switch', 'input_boolean', 'light', 'script', 'scene', 'automation']);

// ── Formattage de l'état numérique ────────────────────────────────────────────
function formatState(state: string, unit?: string): string {
  const num = parseFloat(state);
  if (isNaN(num)) return state;
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

// ── Couleur basée sur les seuils ──────────────────────────────────────────────
function getThresholdColor(
  value: number,
  thresholds?: { value: number; color: string }[],
): string | undefined {
  if (!thresholds?.length) return undefined;
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  let color: string | undefined;
  for (const t of sorted) {
    if (value >= t.value) color = t.color;
  }
  return color;
}

export function SensorCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<SensorCardConfig>(widgetId || 'sensor');
  const entityId = config?.entityId ?? 'sensor.temperature_chambre_temperature';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-5 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Entité introuvable</span>
      </motion.div>
    );
  }

  const domain = entityId.split('.')[0];
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const state = entity.state;
  const numericValue = parseFloat(state);
  const isNumeric = !isNaN(numericValue);
  const isToggleable = TOGGLEABLE.has(domain);
  const isOn = ['on', 'playing', 'home', 'heating'].includes(state);

  const iconName = config?.icon ?? DOMAIN_ICONS[domain] ?? 'Activity';
  const IconComponent = resolveIcon(iconName);

  const thresholdColor = isNumeric
    ? getThresholdColor(numericValue, config?.thresholds)
    : undefined;

  const handleToggle = () => {
    if (!isToggleable) return;
    if (domain === 'script') {
      helpers.callService({ domain: 'script', service: 'turn_on', target: { entity_id: entityId } });
    } else if (domain === 'scene') {
      helpers.callService({ domain: 'scene', service: 'turn_on', target: { entity_id: entityId } });
    } else {
      helpers.callService({ domain, service: 'toggle', target: { entity_id: entityId } });
    }
  };

  const displayState = (() => {
    if (domain === 'binary_sensor') {
      return isOn ? (config?.onText ?? 'Actif') : (config?.offText ?? 'Inactif');
    }
    if (isToggleable) {
      return isOn ? 'Allumé' : 'Éteint';
    }
    return formatState(state, unit);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'gc rounded-3xl p-5 flex flex-col justify-between h-full cursor-default',
        isToggleable && 'cursor-pointer',
      )}
      onClick={isToggleable ? handleToggle : undefined}
    >
      {/* Header: icône + badge */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isOn ? 'bg-amber-400/20' : 'bg-white/5',
          )}
          style={thresholdColor ? { backgroundColor: `${thresholdColor}20` } : undefined}
        >
          {IconComponent ? (
            <IconComponent
              size={20}
              className={isOn ? 'text-amber-400' : 'text-white/60'}
              style={thresholdColor ? { color: thresholdColor } : undefined}
            />
          ) : (
            <Power size={20} className="text-white/60" />
          )}
        </div>

        {isToggleable && (
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full',
              isOn
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-white/30',
            )}
          >
            {isOn ? 'ON' : 'OFF'}
          </span>
        )}
      </div>

      {/* Body: valeur principale */}
      <div className="mt-auto">
        <div
          className="text-3xl font-light text-white tracking-tight"
          style={thresholdColor ? { color: thresholdColor } : undefined}
        >
          {isNumeric ? formatState(state) : displayState}
        </div>
        <div className="text-white/40 text-xs mt-1 uppercase tracking-wider">
          {name}
          {isNumeric && unit && (
            <span className="text-white/25 ml-1">{unit}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

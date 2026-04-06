# 02 — LightCard : Contrôle des lumières

## Objectif

Créer un widget **LightCard** qui permet de contrôler une lumière ou un groupe de lumières directement depuis le dashboard : toggle on/off, slider de luminosité, et indicateur d'état visuel. Inspiré de la LightCard de Tunet.

## Résultat attendu

- Toggle on/off en cliquant sur la card
- Slider de luminosité (si la lumière supporte le dimming)
- Icône qui s'illumine quand la lumière est allumée
- Nom + pourcentage de luminosité affiché
- Support des groupes de lumières (affiche le nombre de lumières actives)
- Taille responsive (petit = toggle simple, grand = toggle + slider)

---

## Étape 1 : Type de config

Fichier : `src/types/widget-configs.ts`

```typescript
// ── Light ─────────────────────────────────────────────────────────────────────
export interface LightCardConfig {
  type: 'light';
  entityId: string;          // light.xxx ou light.group_xxx
  name?: string;             // Nom affiché (sinon friendly_name)
  icon?: string;             // Icône lucide custom
  /** Si true, c'est un groupe : affiche "X/Y allumées" */
  isGroup?: boolean;
  /** Entity IDs des sous-lumières du groupe (pour compter les actives) */
  groupEntities?: string[];
}
```

Ajouter à l'union `WidgetConfig` et dans `DEFAULT_WIDGET_CONFIGS`:
```typescript
light: {
  type: 'light',
  entityId: 'light.salon',
  name: 'Salon',
},
```

Ajouter les champs dans `WIDGET_FIELD_DEFS`:
```typescript
light: [
  { key: 'entityId', label: 'Entité lumière', type: 'entity', domain: 'light' },
  { key: 'name', label: 'Nom affiché', type: 'text' },
  { key: 'icon', label: 'Icône', type: 'icon' },
  { key: 'isGroup', label: 'Groupe de lumières', type: 'boolean' },
  { key: 'groupEntities', label: 'Entités du groupe', type: 'entity-list', domain: 'light' },
],
```

---

## Étape 2 : Enregistrer dans le système de grille

Fichier : `src/context/DashboardLayoutContext.tsx`

```typescript
// GridWidget['type'] — ajouter 'light'
type: '... | 'light';

// WIDGET_CATALOG
{ type: 'light', label: 'Lumière', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },

// SIZE_PRESETS
light: {
  lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 2 }, { name: 'Large', w: 4, h: 3 }],
  md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],
  sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],
},
```

Fichier : `src/components/layout/DashboardGrid.tsx`
```typescript
light: 'Lumière',
```

---

## Étape 3 : Créer le composant

### `src/components/cards/LightCard/index.ts`
```typescript
export { LightCard } from './LightCard';
```

### `src/components/cards/LightCard/LightCard.tsx`

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import type { LightCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

// ── Debounce helper (200ms comme Tunet) ───────────────────────────────────────
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
  const { getWidgetConfig } = useDashboardLayout();
  const config = getWidgetConfig<LightCardConfig>('light');
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
  const currentBrightness = localBrightness ?? (haBrightness ? Math.round((haBrightness / 255) * 100) : 0);

  // Détection si la lumière supporte le dimming
  const colorModes = entity.attributes.supported_color_modes as string[] | undefined;
  const isDimmable = colorModes
    ? colorModes.some(m => m !== 'onoff')
    : haBrightness !== undefined;

  // Toggle on/off
  const handleToggle = () => {
    helpers.callService({
      domain: 'light',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  };

  // Brightness change (debounced → service call)
  const sendBrightness = useDebouncedCallback((pct: number) => {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { brightness_pct: pct },
    });
  }, 200);

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
      <div className="mt-auto">
        <div className="text-white/40 text-xs uppercase tracking-wider">{name}</div>
      </div>
    </motion.div>
  );
}
```

---

## Étape 4 : LightModal (contrôle avancé)

Créer un panel/modal pour le contrôle avancé quand on clique longuement ou sur un bouton dédié. Le modal permet de :
- Voir et ajuster la luminosité avec un grand slider
- Contrôler la température de couleur (si supportée)
- Color picker RGB (si supporté)
- Voir les lumières du groupe et les contrôler individuellement

### `src/components/panels/LightControlPanel.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Lightbulb, Sun, Palette } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';

interface LightControlPanelProps {
  entityId: string;
}

export function LightControlPanel({ entityId }: LightControlPanelProps) {
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!entity) return <div className="text-white/30 p-4">Lumière introuvable</div>;

  const isOn = entity.state === 'on';
  const brightness = entity.attributes.brightness as number | undefined;
  const colorTemp = entity.attributes.color_temp_kelvin as number | undefined;
  const minColorTemp = entity.attributes.min_color_temp_kelvin as number | undefined;
  const maxColorTemp = entity.attributes.max_color_temp_kelvin as number | undefined;
  const colorModes = entity.attributes.supported_color_modes as string[] | undefined;

  const supportsColorTemp = colorModes?.includes('color_temp') ?? false;
  const supportsRGB = colorModes?.some(m => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m)) ?? false;

  const brightnessPct = brightness != null ? Math.round((brightness / 255) * 100) : 0;

  const setBrightness = (pct: number) => {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { brightness_pct: pct },
    });
  };

  const setColorTemp = (kelvin: number) => {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { color_temp_kelvin: kelvin },
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Brightness */}
      <div>
        <label className="text-white/60 text-sm flex items-center gap-2 mb-3">
          <Sun size={16} /> Luminosité — {brightnessPct}%
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={brightnessPct}
          onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-amber-400"
        />
      </div>

      {/* Color Temperature */}
      {supportsColorTemp && minColorTemp && maxColorTemp && (
        <div>
          <label className="text-white/60 text-sm flex items-center gap-2 mb-3">
            <Palette size={16} /> Température — {colorTemp ?? minColorTemp}K
          </label>
          <input
            type="range"
            min={minColorTemp}
            max={maxColorTemp}
            value={colorTemp ?? minColorTemp}
            onChange={(e) => setColorTemp(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white"
            style={{
              background: 'linear-gradient(to right, #ff9329, #ffffff, #94c5ff)',
            }}
          />
        </div>
      )}

      {/* TODO : Color picker RGB si supportsRGB */}
    </div>
  );
}
```

---

## Étape 5 : Enregistrer dans Dashboard.tsx

```typescript
import { LightCard } from '@/components/cards/LightCard/LightCard';

// Dans le switch :
case 'light':
  return <LightCard />;
```

---

## Vérification

- [ ] `npx tsc --noEmit` passe
- [ ] Le widget affiche correctement une lumière on/off
- [ ] Le slider de brightness fonctionne (debounce 200ms)
- [ ] Le badge affiche le % quand allumé, "OFF" quand éteint
- [ ] L'icône s'illumine (glow effect) quand la lumière est on
- [ ] Le toggle on/off fonctionne en cliquant sur l'icône

## Améliorations futures

- [ ] Support du ColorPicker RGB (via `<input type="color">` ou un composant custom)
- [ ] Groupe de lumières : compter les actives via `groupEntities`
- [ ] Long-press pour ouvrir le LightControlPanel
- [ ] Animation de transition quand l'état change

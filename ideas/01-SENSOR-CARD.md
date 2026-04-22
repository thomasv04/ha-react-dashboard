# 01 — SensorCard : Widget capteur générique

## Objectif

Créer un widget **SensorCard** polyvalent qui peut afficher n'importe quel capteur Home Assistant : température, humidité, puissance, binary_sensor, switch, input_boolean, script, scene, automation. C'est le widget le plus versatile — il couvre tous les cas non couverts par les widgets spécialisés.

## Résultat attendu

- Card qui affiche : icône + nom + état + unité
- Supporte les variantes : `numeric` (simple), `gauge` (jauge circulaire), `sparkline` (mini-graphe)
- Supporte les capteurs binaires (on/off avec texte traduit)
- Supporte les switches/scripts/scenes (bouton toggle)
- Taille responsive (petit = icône + état, grand = état + graphe)

---

## Étape 1 : Ajouter le type de config

Fichier : `src/types/widget-configs.ts`

```typescript
// ── Sensor ────────────────────────────────────────────────────────────────────
export type SensorVariant = 'default' | 'gauge' | 'sparkline';

export interface SensorCardConfig {
  type: 'sensor';
  entityId: string;
  name?: string;         // Nom custom (sinon friendly_name de l'entité)
  icon?: string;         // Nom d'icône lucide (sinon auto-détection par domaine)
  variant?: SensorVariant;
  /** Pour gauge/sparkline : min et max */
  min?: number;
  max?: number;
  /** Seuils de couleur : [{value: 30, color: '#22c55e'}, {value: 60, color: '#f59e0b'}, {value: 90, color: '#ef4444'}] */
  thresholds?: { value: number; color: string }[];
  /** Pour les binary_sensor : textes personnalisés pour on/off */
  onText?: string;
  offText?: string;
}
```

Ajouter à l'union `WidgetConfig` :
```typescript
export type WidgetConfig =
  | ActivityBarConfig
  | CameraCardConfig
  // ... existants ...
  | SensorCardConfig;  // ← AJOUTER
```

Ajouter la config par défaut dans `DEFAULT_WIDGET_CONFIGS`:
```typescript
sensor: {
  type: 'sensor',
  entityId: 'sensor.temperature_chambre_temperature',
  name: 'Chambre',
  variant: 'default',
},
```

Ajouter la définition des champs pour le WidgetEditModal dans `WIDGET_FIELD_DEFS`:
```typescript
sensor: [
  { key: 'entityId', label: 'Entité', type: 'entity' },
  { key: 'name', label: 'Nom affiché', type: 'text' },
  { key: 'icon', label: 'Icône', type: 'icon' },
  { key: 'variant', label: 'Variante', type: 'select', options: [
    { value: 'default', label: 'Simple' },
    { value: 'gauge', label: 'Jauge' },
    { value: 'sparkline', label: 'Mini-graphe' },
  ]},
  { key: 'min', label: 'Valeur min', type: 'number' },
  { key: 'max', label: 'Valeur max', type: 'number' },
],
```

---

## Étape 2 : Enregistrer dans le système de grille

Fichier : `src/context/DashboardLayoutContext.tsx`

1. Ajouter `'sensor'` au type union de `GridWidget['type']`:
```typescript
export interface GridWidget {
  id: string;
  type: 'camera' | 'weather' | ... | 'sensor';  // ← ajouter
  // ...
}
```

2. Ajouter au `WIDGET_CATALOG`:
```typescript
{ type: 'sensor', label: 'Capteur', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
```

3. Ajouter aux `SIZE_PRESETS`:
```typescript
sensor: {
  lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 2 }, { name: 'Large', w: 4, h: 3 }],
  md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],
  sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],
},
```

Fichier : `src/components/layout/DashboardGrid.tsx` — ajouter le label :
```typescript
export const WIDGET_LABELS: Record<string, string> = {
  // ... existants ...
  sensor: 'Capteur',
};
```

---

## Étape 3 : Créer le composant SensorCard

Créer le dossier `src/components/cards/SensorCard/`

### `src/components/cards/SensorCard/index.ts`
```typescript
export { SensorCard } from './SensorCard';
```

### `src/components/cards/SensorCard/SensorCard.tsx`

```typescript
import { motion } from 'framer-motion';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import type { SensorCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { Power } from 'lucide-react';
import { useHass } from '@hakit/core';

// ── Domaine → icône par défaut ────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, string> = {
  'sensor': 'Activity',
  'binary_sensor': 'CircleDot',
  'switch': 'ToggleRight',
  'input_boolean': 'ToggleRight',
  'light': 'Lightbulb',
  'script': 'Play',
  'scene': 'Theater',
  'automation': 'Zap',
};

// ── Domaines "actionnables" (toggle) ──────────────────────────────────────────
const TOGGLEABLE = new Set(['switch', 'input_boolean', 'light', 'script', 'scene', 'automation']);

// ── Formattage de l'état numérique ────────────────────────────────────────────
function formatState(state: string, unit?: string): string {
  const num = parseFloat(state);
  if (isNaN(num)) return state;
  // Arrondir à 1 décimale
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
  const config = getWidgetConfig<SensorCardConfig>('sensor');
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

  // Icône
  const iconName = config?.icon ?? DOMAIN_ICONS[domain] ?? 'Activity';
  const IconComponent = resolveIcon(iconName);

  // Couleur selon les seuils
  const thresholdColor = isNumeric
    ? getThresholdColor(numericValue, config?.thresholds)
    : undefined;

  // Toggle action
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

  // ── Binary sensor text ────────────────────────────────────────────────────
  const displayState = (() => {
    if (domain === 'binary_sensor') {
      return isOn
        ? (config?.onText ?? 'Actif')
        : (config?.offText ?? 'Inactif');
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
      {/* Header: icône + état court */}
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

        {/* Optionnel: badge d'état pour toggleable */}
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
```

---

## Étape 4 : Enregistrer dans Dashboard.tsx

Fichier : `src/Dashboard.tsx`

1. Ajouter l'import :
```typescript
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
```

2. Ajouter dans le switch de rendu des widgets (chercher le pattern existant avec les `case` ou le `map`) :
```typescript
case 'sensor':
  return <SensorCard />;
```

Fichier : `src/components/layout/WidgetEditModal.tsx`

Ajouter au `WIDGET_COMPONENTS`:
```typescript
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  // ... existants ...
  sensor: SensorCard,
};
```

---

## Étape 5 : Tests

### `src/components/cards/SensorCard/SensorCard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SensorCard } from './SensorCard';

// Mock hooks
const mockEntity = {
  state: '22.5',
  attributes: {
    friendly_name: 'Température Chambre',
    unit_of_measurement: '°C',
  },
};

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => mockEntity),
}));

vi.mock('@hakit/core', () => ({
  useHass: vi.fn(() => ({
    helpers: { callService: vi.fn() },
  })),
}));

vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'sensor',
      entityId: 'sensor.temperature_chambre_temperature',
      name: 'Chambre',
    }),
  })),
}));

describe('SensorCard', () => {
  it('renders numeric sensor value', () => {
    render(<SensorCard />);
    expect(screen.getByText('22.5')).toBeInTheDocument();
    expect(screen.getByText(/chambre/i)).toBeInTheDocument();
  });

  it('renders fallback when entity not found', () => {
    const { useSafeEntity } = await import('@/hooks/useSafeEntity');
    vi.mocked(useSafeEntity).mockReturnValueOnce(null);
    render(<SensorCard />);
    expect(screen.getByText(/introuvable/i)).toBeInTheDocument();
  });
});
```

---

## Étape 6 : Storybook

### `src/components/cards/SensorCard/SensorCard.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { SensorCard } from './SensorCard';

const meta = {
  title: 'Cards/SensorCard',
  component: SensorCard,
  decorators: [
    (Story) => (
      <div className="w-[280px] h-[200px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SensorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Temperature: Story = {};
export const BinarySensor: Story = {};
export const Switch: Story = {};
```

---

## Vérification finale

Checklist avant de merger :
- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] `npx vite build` réussit
- [ ] `npm test` — tous les tests passent
- [ ] Le widget apparaît dans le dashboard en mode édition (bouton +)
- [ ] Le widget affiche correctement un capteur numérique
- [ ] Le WidgetEditModal permet de changer l'entité
- [ ] Le preview live fonctionne dans le modal d'édition

---

## Pour la suite

Une fois le SensorCard basique en place, tu pourras ajouter les variantes `gauge` et `sparkline` (voir [07-CHARTS.md](./07-CHARTS.md)) comme composants enfants conditionnels dans le render.

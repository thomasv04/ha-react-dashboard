# 03 — PersonStatus : Présence des habitants

## Objectif

Créer un widget **PersonStatus** qui affiche les personnes du foyer avec leur état de présence (home/away), leur photo, et leur zone actuelle. Visible en haut du dashboard comme dans les screenshots de Tunet.

## Résultat attendu

- Avatar de la personne (photo de profil HA ou icône)
- Nom de la personne
- Badge zone (HOME / zone custom / Away)
- Indicateur visuel : couleur verte si home, gris si away
- Filtre grayscale quand la personne est absente
- Layout horizontal (row de PersonStatus dans un conteneur)

---

## Étape 1 : Type de config

Fichier : `src/types/widget-configs.ts`

```typescript
// ── Person Status ─────────────────────────────────────────────────────────────
export interface PersonEntry {
  entityId: string;       // person.thomas, person.marie
  name?: string;          // Nom custom (sinon friendly_name)
}

export interface PersonStatusConfig {
  type: 'person';
  persons: PersonEntry[];
}
```

Ajouter à `WidgetConfig` union et `DEFAULT_WIDGET_CONFIGS`:
```typescript
person: {
  type: 'person',
  persons: [
    { entityId: 'person.thomas', name: 'Thomas' },
    { entityId: 'person.marie', name: 'Marie' },
  ],
},
```

Champs pour le WidgetEditModal:
```typescript
person: [
  { key: 'persons', label: 'Personnes', type: 'entity-list', domain: 'person' },
],
```

---

## Étape 2 : Enregistrer dans le système de grille

```typescript
// GridWidget['type'] — ajouter 'person'

// WIDGET_CATALOG
{ type: 'person', label: 'Personnes', lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },

// SIZE_PRESETS
person: {
  lg: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 6, h: 1 }, { name: 'Large', w: 8, h: 1 }],
  md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 8, h: 1 }, { name: 'Large', w: 8, h: 1 }],
  sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 1 }, { name: 'Large', w: 4, h: 1 }],
},

// WIDGET_LABELS
person: 'Personnes',
```

---

## Étape 3 : Composant PersonStatus

### `src/components/cards/PersonStatus/index.ts`
```typescript
export { PersonStatusCard } from './PersonStatusCard';
```

### `src/components/cards/PersonStatus/PersonStatusCard.tsx`

```typescript
import { motion } from 'framer-motion';
import { User, MapPin } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import type { PersonStatusConfig, PersonEntry } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

// ── Zone normalization (comme Tunet) ──────────────────────────────────────────
function normalizeZone(zone: string | undefined): string {
  if (!zone) return 'unknown';
  const lower = zone.toLowerCase().trim();
  if (lower === 'home' || lower === 'maison' || lower === 'domicile') return 'home';
  if (lower === 'not_home' || lower === 'away') return 'away';
  return zone; // Zone custom (travail, école, etc.)
}

function getZoneLabel(zone: string): string {
  const normalized = normalizeZone(zone);
  if (normalized === 'home') return 'MAISON';
  if (normalized === 'away') return 'ABSENT';
  if (normalized === 'unknown') return '—';
  return zone.toUpperCase();
}

// ── Single person pill ────────────────────────────────────────────────────────
function PersonPill({ entry }: { entry: PersonEntry }) {
  const entity = useSafeEntity(entry.entityId);

  if (!entity) return null;

  const name = entry.name ?? (entity.attributes.friendly_name as string) ?? entry.entityId;
  const zone = entity.state;
  const isHome = normalizeZone(zone) === 'home';
  const picture = entity.attributes.entity_picture as string | undefined;
  const zoneLabel = getZoneLabel(zone);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-2xl transition-all',
        isHome ? 'bg-white/5' : 'bg-white/[0.02]',
      )}
    >
      {/* Avatar */}
      <div className="relative">
        {picture ? (
          <img
            src={picture}
            alt={name}
            className={cn(
              'w-9 h-9 rounded-full object-cover border-2',
              isHome ? 'border-green-400' : 'border-white/10 grayscale',
            )}
          />
        ) : (
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center',
              isHome ? 'bg-green-500/20 border-2 border-green-400' : 'bg-white/5 border-2 border-white/10',
            )}
          >
            <User size={16} className={isHome ? 'text-green-400' : 'text-white/30'} />
          </div>
        )}

        {/* Dot indicateur */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a14]',
            isHome ? 'bg-green-400' : 'bg-white/20',
          )}
        />
      </div>

      {/* Texte */}
      <div className="flex flex-col min-w-0">
        <span className={cn(
          'text-sm font-medium truncate',
          isHome ? 'text-white' : 'text-white/40',
        )}>
          {name}
        </span>
        <span className={cn(
          'text-[10px] font-bold uppercase tracking-wider',
          isHome ? 'text-green-400' : 'text-white/20',
        )}>
          {zoneLabel}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export function PersonStatusCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const config = getWidgetConfig<PersonStatusConfig>('person');
  const persons = config?.persons ?? [];

  if (persons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Aucune personne configurée
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 h-full overflow-x-auto scrollbar-none px-1">
      {persons.map((entry) => (
        <PersonPill key={entry.entityId} entry={entry} />
      ))}
    </div>
  );
}
```

---

## Étape 4 : Enregistrer dans Dashboard.tsx

```typescript
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';

// Dans le switch :
case 'person':
  return <PersonStatusCard />;
```

Et dans `WidgetEditModal.tsx` → `WIDGET_COMPONENTS`:
```typescript
person: PersonStatusCard,
```

---

## Étape 5 : Tests

### `src/components/cards/PersonStatus/PersonStatusCard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonStatusCard } from './PersonStatusCard';

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn((id: string) => {
    if (id === 'person.thomas') return {
      state: 'home',
      attributes: { friendly_name: 'Thomas', entity_picture: '/api/image/thomas.jpg' },
    };
    if (id === 'person.marie') return {
      state: 'not_home',
      attributes: { friendly_name: 'Marie', entity_picture: null },
    };
    return null;
  }),
}));

vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'person',
      persons: [
        { entityId: 'person.thomas' },
        { entityId: 'person.marie' },
      ],
    }),
  })),
}));

describe('PersonStatusCard', () => {
  it('renders person names', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('Thomas')).toBeInTheDocument();
    expect(screen.getByText('Marie')).toBeInTheDocument();
  });

  it('shows MAISON for home state', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('MAISON')).toBeInTheDocument();
  });

  it('shows ABSENT for not_home', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('ABSENT')).toBeInTheDocument();
  });
});
```

---

## Design notes

- Le widget est idéalement placé en haut du dashboard (comme Tunet), sous le GreetingCard/ActivityBar
- Dans les screenshots Tunet, les PersonStatus sont dans une rangée horizontale avec des avatars circulaires
- Le glow vert autour de l'avatar quand la personne est à la maison est un détail UX important
- Le filtre `grayscale` sur l'avatar des absents donne un feedback visuel immédiat

## Vérification

- [ ] `npx tsc --noEmit` passe
- [ ] Le widget affiche les personnes avec leur photo HA
- [ ] `home` → avatar coloré + badge vert "MAISON"
- [ ] `not_home` → avatar gris + badge "ABSENT"
- [ ] Les zones custom s'affichent correctement (ex: "TRAVAIL")

# 04 — MediaPlayerCard : Lecteur multimédia

## Objectif

Créer un widget **MediaPlayerCard** qui affiche l'état d'un lecteur multimédia (Sonos, Chromecast, Apple TV, etc.) avec pochette d'album, contrôles play/pause/skip, et informations sur le média en cours.

## Résultat attendu

- Pochette d'album en fond (floutée) + en petit (cover)
- Titre + artiste + album (texte tronqué)
- Contrôles : previous / play-pause / next
- Indicateur d'état (playing, paused, idle, off)
- Toggle power on/off
- Taille responsive : petit = info minimale, grand = pochette + contrôles complets

---

## Étape 1 : Type de config

Fichier : `src/types/widget-configs.ts`

```typescript
// ── Media Player ──────────────────────────────────────────────────────────────
export interface MediaPlayerCardConfig {
  type: 'media_player';
  entityId: string;              // media_player.sonos_salon
  name?: string;                 // Nom custom
  /** Mode d'affichage de la pochette */
  artworkMode?: 'background' | 'cover' | 'none';
}
```

Ajouter à `WidgetConfig` union et `DEFAULT_WIDGET_CONFIGS`:
```typescript
media_player: {
  type: 'media_player',
  entityId: 'media_player.sonos_salon',
  name: 'Sonos Salon',
  artworkMode: 'background',
},
```

Champs pour le WidgetEditModal:
```typescript
media_player: [
  { key: 'entityId', label: 'Lecteur média', type: 'entity', domain: 'media_player' },
  { key: 'name', label: 'Nom affiché', type: 'text' },
  { key: 'artworkMode', label: 'Affichage pochette', type: 'select', options: [
    { value: 'background', label: 'En fond (flouté)' },
    { value: 'cover', label: 'Miniature' },
    { value: 'none', label: 'Aucun' },
  ]},
],
```

---

## Étape 2 : Enregistrer dans le système de grille

```typescript
// GridWidget['type'] — ajouter 'media_player'

// WIDGET_CATALOG
{ type: 'media_player', label: 'Média', lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },

// SIZE_PRESETS
media_player: {
  lg: [{ name: 'Compact', w: 3, h: 2 }, { name: 'Normal', w: 4, h: 3 }, { name: 'Large', w: 6, h: 4 }],
  md: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 4, h: 3 }, { name: 'Large', w: 8, h: 3 }],
  sm: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 4, h: 3 }, { name: 'Large', w: 4, h: 4 }],
},

// WIDGET_LABELS
media_player: 'Média',
```

---

## Étape 3 : Composant MediaPlayerCard

### `src/components/cards/MediaPlayerCard/index.ts`
```typescript
export { MediaPlayerCard } from './MediaPlayerCard';
```

### `src/components/cards/MediaPlayerCard/MediaPlayerCard.tsx`

```typescript
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Power, Music } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import type { MediaPlayerCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

// ── Power action detection (comme Tunet) ──────────────────────────────────────
function getPowerAction(state: string): 'turn_on' | 'turn_off' {
  return state === 'off' || state === 'unavailable' ? 'turn_on' : 'turn_off';
}

export function MediaPlayerCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const config = getWidgetConfig<MediaPlayerCardConfig>('media_player');
  const entityId = config?.entityId ?? 'media_player.sonos_salon';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-5 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Lecteur introuvable</span>
      </motion.div>
    );
  }

  const state = entity.state; // playing, paused, idle, off, unavailable
  const isPlaying = state === 'playing';
  const isPaused = state === 'paused';
  const isOff = state === 'off' || state === 'unavailable';
  const isActive = isPlaying || isPaused;

  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const title = entity.attributes.media_title as string | undefined;
  const artist = entity.attributes.media_artist as string | undefined;
  const album = entity.attributes.media_album_name as string | undefined;
  const artwork = entity.attributes.entity_picture as string | undefined;
  const artworkMode = config?.artworkMode ?? 'background';

  // Service calls
  const playPause = () => {
    helpers.callService({
      domain: 'media_player',
      service: 'media_play_pause',
      target: { entity_id: entityId },
    });
  };

  const previous = () => {
    helpers.callService({
      domain: 'media_player',
      service: 'media_previous_track',
      target: { entity_id: entityId },
    });
  };

  const next = () => {
    helpers.callService({
      domain: 'media_player',
      service: 'media_next_track',
      target: { entity_id: entityId },
    });
  };

  const togglePower = () => {
    helpers.callService({
      domain: 'media_player',
      service: getPowerAction(state),
      target: { entity_id: entityId },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="gc rounded-3xl overflow-hidden relative h-full flex flex-col"
    >
      {/* Background artwork (blurred) */}
      {artwork && artworkMode === 'background' && isActive && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-30"
          style={{ backgroundImage: `url(${artwork})` }}
        />
      )}

      {/* Content overlay */}
      <div className="relative z-10 p-5 flex flex-col h-full">
        {/* Header : nom du lecteur + power */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {name}
          </span>
          <button
            onClick={togglePower}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              isOff ? 'bg-white/5 hover:bg-white/10' : 'bg-green-500/20',
            )}
          >
            <Power size={14} className={isOff ? 'text-white/30' : 'text-green-400'} />
          </button>
        </div>

        {/* Media info */}
        <div className="flex items-start gap-4 flex-1 min-h-0">
          {/* Cover art */}
          {artwork && artworkMode !== 'none' && isActive && (
            <img
              src={artwork}
              alt="cover"
              className="w-16 h-16 rounded-xl object-cover shadow-lg flex-shrink-0"
            />
          )}

          {/* Placeholder si pas d'artwork */}
          {(!artwork || !isActive) && (
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
              <Music size={24} className="text-white/20" />
            </div>
          )}

          {/* Text info */}
          <div className="flex flex-col justify-center min-w-0 flex-1">
            {isActive && title ? (
              <>
                <div className="text-white text-sm font-semibold truncate">{title}</div>
                {artist && <div className="text-white/50 text-xs truncate">{artist}</div>}
                {album && <div className="text-white/30 text-[11px] truncate">{album}</div>}
              </>
            ) : (
              <div className="text-white/30 text-sm">
                {isOff ? 'Éteint' : 'En attente'}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-auto pt-3">
          <button
            onClick={previous}
            disabled={isOff}
            className="text-white/40 hover:text-white transition-colors disabled:opacity-20"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={playPause}
            disabled={isOff}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              isPlaying
                ? 'bg-white text-black shadow-lg shadow-white/20'
                : 'bg-white/10 text-white hover:bg-white/20',
              isOff && 'opacity-20 cursor-not-allowed',
            )}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>

          <button
            onClick={next}
            disabled={isOff}
            className="text-white/40 hover:text-white transition-colors disabled:opacity-20"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## Étape 4 : Enregistrer dans Dashboard.tsx

```typescript
import { MediaPlayerCard } from '@/components/cards/MediaPlayerCard/MediaPlayerCard';

case 'media_player':
  return <MediaPlayerCard />;
```

Et `WidgetEditModal.tsx` → `WIDGET_COMPONENTS`:
```typescript
media_player: MediaPlayerCard,
```

---

## Étape 5 : Tests

### `src/components/cards/MediaPlayerCard/MediaPlayerCard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaPlayerCard } from './MediaPlayerCard';

const mockCallService = vi.fn();

vi.mock('@hakit/core', () => ({
  useHass: vi.fn(() => ({
    helpers: { callService: mockCallService },
  })),
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => ({
    state: 'playing',
    attributes: {
      friendly_name: 'Sonos Salon',
      media_title: 'Bohemian Rhapsody',
      media_artist: 'Queen',
      media_album_name: 'A Night at the Opera',
      entity_picture: '/media/cover.jpg',
    },
  })),
}));

vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'media_player',
      entityId: 'media_player.sonos_salon',
    }),
  })),
}));

describe('MediaPlayerCard', () => {
  it('renders media info when playing', () => {
    render(<MediaPlayerCard />);
    expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
  });

  it('calls play_pause service on button click', () => {
    render(<MediaPlayerCard />);
    const pauseBtn = screen.getByRole('button', { name: '' }); // pause icon
    // Le bouton play/pause est le gros bouton central
    fireEvent.click(pauseBtn);
    expect(mockCallService).toHaveBeenCalled();
  });
});
```

---

## Vérification

- [ ] `npx tsc --noEmit` passe
- [ ] Pochette d'album affichée (blurred background ou cover)
- [ ] Titre + artiste + album affichés
- [ ] Boutons prev/play-pause/next fonctionnels
- [ ] État "Éteint" / "En attente" quand le lecteur est off/idle
- [ ] Le power toggle fonctionne

## Améliorations futures

- [ ] Volume slider
- [ ] Source selection (Spotify, AirPlay, etc.)
- [ ] MediaGroupCard — cycle entre plusieurs lecteurs
- [ ] Playlist browsing (Music Assistant / Sonos Favorites)
- [ ] Progress bar pour le morceau en cours

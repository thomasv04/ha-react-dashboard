# 14 — WallPanel / Écran de veille

## Objectif

Ajouter un mode écran de veille inspiré de [lovelace-wallpanel](https://github.com/j-a-n/lovelace-wallpanel) :
diaporama d'images en plein écran avec des widgets superposés (horloge, météo, énergie…),
activation automatique après inactivité, désactivation au toucher/clic, et activation forcée
via query-string (`?wp_enabled=true`) pour les tablettes murales.

## Résultat attendu

- Overlay plein écran activable après `idle_time` secondes d'inactivité
- Fond : diaporama d'images ou une couleur unie
- Widgets superposés librement repositionnables (même système RGL que le dashboard)
- Bouton **+ WallPanel** dans la barre d'onglets en mode édition (à gauche de l'onglet Accueil)
- Si déjà configuré → bouton **WallPanel** comme un onglet spécial, ouvre le panneau de config
- Bouton **Démo** dans le panneau de config pour prévisualiser sans attendre l'inactivité
- URL param `?wp_enabled=true` pour forcer l'activation (tablette murale)
- Persistance dans la config JSON (format v2 étendu)

---

## Architecture

```
WallPanelContext (NOUVEAU)
  ├── config: WallPanelConfig        // paramètres (idle_time, images, style…)
  ├── isActive: boolean              // écran de veille actuellement affiché
  ├── activate()                     // affiche l'overlay
  ├── deactivate()                   // cache l'overlay
  ├── updateConfig(partial)          // met à jour la config
  └── wallPanelLayout: DashboardLayout  // widgets sur l'overlay (stocké séparément)

useIdleDetector (NOUVEAU hook)
  ├── Écoute mousemove / touchstart / keydown / click
  ├── Reset un timer à chaque événement
  └── Appelle activate() quand le timer expire

WallPanelOverlay (NOUVEAU composant)
  ├── Rendu fullscreen fixed z-[200]
  ├── BackgroundSlideshow — diaporama d'images via <img> avec crossfade
  ├── DashboardGrid (readonly) — widgets positionnés librement sur l'overlay
  └── Clic/tap n'importe où → deactivate()

WallPanelConfigModal (NOUVEAU composant)
  ├── Section "Activation" : idle_time, enabled, screensaver_entity
  ├── Section "Fond" : images (liste URLs), image_fit, media_order, blur
  ├── Section "Widgets" : mini-aperçu de la grille + bouton "Modifier"
  └── Bouton "Démo" → appelle activate()
```

---

## Étape 1 : Types & config WallPanel

### `src/types/wallpanel.ts` (NOUVEAU)

```typescript
export type MediaOrder = 'random' | 'sequential';
export type ImageFit = 'contain' | 'cover' | 'fill';

export interface WallPanelStyle {
  /** Flou de l'image de fond (pixels) */
  backgroundBlur?: number;
  /** Opacité de la boîte d'info (0-1) */
  infoBoxOpacity?: number;
  /** Largeur de la boîte d'info (px) */
  infoBoxWidth?: number;
}

export interface WallPanelConfig {
  /** Activer l'écran de veille */
  enabled: boolean;
  /** Délai d'inactivité avant activation (secondes). 0 = jamais automatique */
  idle_time: number;
  /** URLs des images de fond (peut être une URL HA media-source:// ou https://) */
  image_urls: string[];
  /** Adapter l'image : contain | cover | fill */
  image_fit: ImageFit;
  /** Ordre de défilement : random | sequential */
  media_order: MediaOrder;
  /** Intervalle de rafraîchissement de la liste média (secondes) */
  media_list_update_interval: number;
  /** Durée d'affichage de chaque image (secondes) */
  image_duration: number;
  /** Entité HA pour activer/désactiver depuis HA (ex: input_boolean.wallpanel) */
  screensaver_entity?: string;
  /** Styles avancés */
  style: WallPanelStyle;
}

export const DEFAULT_WALLPANEL_CONFIG: WallPanelConfig = {
  enabled: false,
  idle_time: 300,
  image_urls: [],
  image_fit: 'cover',
  media_order: 'random',
  media_list_update_interval: 43200,
  image_duration: 30,
  screensaver_entity: undefined,
  style: {
    backgroundBlur: 0,
    infoBoxOpacity: 1,
    infoBoxWidth: 380,
  },
};
```

---

## Étape 2 : WallPanelContext

### `src/context/WallPanelContext.tsx` (NOUVEAU)

```typescript
import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import type { WallPanelConfig } from '@/types/wallpanel';
import { DEFAULT_WALLPANEL_CONFIG } from '@/types/wallpanel';
import type { DashboardLayout } from '@/context/DashboardLayoutContext';
import { DEFAULT_LAYOUT } from '@/context/DashboardLayoutContext';

interface WallPanelContextValue {
  config: WallPanelConfig;
  updateConfig: (partial: Partial<WallPanelConfig>) => void;
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  /** Layout des widgets affichés sur l'overlay */
  wallPanelLayout: DashboardLayout;
  setWallPanelLayout: (layout: DashboardLayout) => void;
  /** Indique si le wallpanel a déjà été configuré */
  isConfigured: boolean;
}

const WallPanelContext = createContext<WallPanelContextValue | null>(null);

interface WallPanelProviderProps {
  children: ReactNode;
  initialConfig?: WallPanelConfig;
  initialLayout?: DashboardLayout;
}

export function WallPanelProvider({ children, initialConfig, initialLayout }: WallPanelProviderProps) {
  const [config, setConfig] = useState<WallPanelConfig>(
    initialConfig ?? DEFAULT_WALLPANEL_CONFIG
  );
  const [isActive, setIsActive] = useState(false);
  const [wallPanelLayout, setWallPanelLayout] = useState<DashboardLayout>(
    initialLayout ?? { ...DEFAULT_LAYOUT, widgets: { lg: [], md: [], sm: [] } }
  );

  const isConfigured = config.image_urls.length > 0 || wallPanelLayout.widgets.lg.length > 0;

  const activate = useCallback(() => setIsActive(true), []);
  const deactivate = useCallback(() => setIsActive(false), []);
  const updateConfig = useCallback((partial: Partial<WallPanelConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  // Activation forcée via URL param (?wp_enabled=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wp_enabled') === 'true') {
      setIsActive(true);
    }
  }, []);

  return (
    <WallPanelContext.Provider value={{
      config,
      updateConfig,
      isActive,
      activate,
      deactivate,
      wallPanelLayout,
      setWallPanelLayout,
      isConfigured,
    }}>
      {children}
    </WallPanelContext.Provider>
  );
}

export function useWallPanel() {
  const ctx = useContext(WallPanelContext);
  if (!ctx) throw new Error('useWallPanel must be used within WallPanelProvider');
  return ctx;
}
```

---

## Étape 3 : Hook useIdleDetector

### `src/hooks/useIdleDetector.ts` (NOUVEAU)

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface UseIdleDetectorOptions {
  /** Délai en secondes. 0 désactive le détecteur. */
  idleTime: number;
  enabled: boolean;
  onIdle: () => void;
  onActive: () => void;
}

/**
 * Détecte l'inactivité de l'utilisateur (souris, tactile, clavier).
 * Appelle onIdle après idleTime secondes sans interaction.
 * Appelle onActive dès qu'une interaction est détectée après l'état idle.
 */
export function useIdleDetector({ idleTime, enabled, onIdle, onActive }: UseIdleDetectorOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isIdleRef.current) {
      isIdleRef.current = false;
      onActive();
    }
    if (!enabled || idleTime <= 0) return;
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      onIdle();
    }, idleTime * 1000);
  }, [enabled, idleTime, onIdle, onActive]);

  useEffect(() => {
    if (!enabled || idleTime <= 0) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // démarrer le timer dès le montage

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, idleTime, resetTimer]);
}
```

---

## Étape 4 : Composant BackgroundSlideshow

### `src/components/wallpanel/BackgroundSlideshow.tsx` (NOUVEAU)

```typescript
import { useState, useEffect, useRef } from 'react';
import type { WallPanelConfig } from '@/types/wallpanel';

interface BackgroundSlideshowProps {
  config: WallPanelConfig;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function BackgroundSlideshow({ config }: BackgroundSlideshowProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [orderedUrls, setOrderedUrls] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // (Re)construire la liste ordonnée quand la config change
  useEffect(() => {
    if (config.image_urls.length === 0) return;
    const urls = config.media_order === 'random'
      ? shuffleArray(config.image_urls)
      : [...config.image_urls];
    setOrderedUrls(urls);
    setCurrentIdx(0);
    setNextIdx(Math.min(1, urls.length - 1));
  }, [config.image_urls, config.media_order]);

  // Timer de défilement
  useEffect(() => {
    if (orderedUrls.length <= 1 || config.image_duration <= 0) return;
    intervalRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % orderedUrls.length);
        setNextIdx(prev => (prev + 1) % orderedUrls.length);
        setTransitioning(false);
      }, 1000); // durée du crossfade CSS
    }, config.image_duration * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [orderedUrls, config.image_duration]);

  if (orderedUrls.length === 0) {
    // Fond dégradé par défaut si aucune image
    return (
      <div
        className='absolute inset-0'
        style={{ background: 'linear-gradient(135deg, #0c1028 0%, #1a2550 100%)' }}
      />
    );
  }

  const blurPx = config.style.backgroundBlur ?? 0;

  return (
    <div className='absolute inset-0 overflow-hidden'>
      {/* Image courante */}
      <img
        key={`cur-${currentIdx}`}
        src={orderedUrls[currentIdx]}
        className='absolute inset-0 w-full h-full transition-opacity duration-1000'
        style={{
          objectFit: config.image_fit,
          opacity: transitioning ? 0 : 1,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: blurPx > 0 ? 'scale(1.05)' : undefined, // évite les bords blancs du blur
        }}
        alt=''
      />
      {/* Prochaine image (pré-chargée derrière) */}
      {orderedUrls.length > 1 && (
        <img
          key={`next-${nextIdx}`}
          src={orderedUrls[nextIdx]}
          className='absolute inset-0 w-full h-full transition-opacity duration-1000'
          style={{
            objectFit: config.image_fit,
            opacity: transitioning ? 1 : 0,
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            transform: blurPx > 0 ? 'scale(1.05)' : undefined,
          }}
          alt=''
        />
      )}
      {/* Vignette subtile pour améliorer la lisibilité des widgets */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }}
      />
    </div>
  );
}
```

---

## Étape 5 : Overlay principal WallPanelOverlay

### `src/components/wallpanel/WallPanelOverlay.tsx` (NOUVEAU)

```typescript
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallPanel } from '@/context/WallPanelContext';
import { BackgroundSlideshow } from './BackgroundSlideshow';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import type { GridWidget } from '@/context/DashboardLayoutContext';

// Réutiliser le même map WIDGET_COMPONENTS que Dashboard.tsx
import { WeatherCard }       from '@/components/cards/WeatherCard/WeatherCard';
import { GreetingCard }      from '@/components/cards/GreetingCard/GreetingCard';
import { EnergyCard }        from '@/components/cards/EnergyCard/EnergyCard';
import { TempoCard }         from '@/components/cards/TempoCard/TempoCard';
import { ThermostatCard }    from '@/components/cards/ThermostatCard/ThermostatCard';
import { ActivityBar }       from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard }        from '@/components/cards/SensorCard/SensorCard';
import { LightCard }         from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard }  from '@/components/cards/PersonStatus/PersonStatusCard';
import { TemplateCard }      from '@/components/cards/TemplateCard/TemplateCard';

const WIDGET_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
  weather:    WeatherCard,
  thermostat: ThermostatCard,
  energy:     EnergyCard,
  tempo:      TempoCard,
  greeting:   GreetingCard,
  activity:   ActivityBar,
  sensor:     SensorCard,
  light:      LightCard,
  person:     PersonStatusCard,
  template:   TemplateCard,
};

export function WallPanelOverlay() {
  const { isActive, deactivate, wallPanelLayout } = useWallPanel();
  const widgets = wallPanelLayout.widgets.lg;

  // Désactiver avec Echap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') deactivate(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deactivate]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key='wallpanel-overlay'
          className='fixed inset-0 z-[200] overflow-hidden cursor-pointer select-none'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onClick={deactivate}
        >
          {/* Fond (slideshow ou dégradé) */}
          <BackgroundSlideshow config={useWallPanel().config} />

          {/* Widgets — stopPropagation pour ne pas fermer l'overlay en cliquant dessus */}
          <div
            className='absolute inset-0 pointer-events-none'
            onClick={e => e.stopPropagation()}
          >
            <div className='pointer-events-auto max-w-[1440px] mx-auto px-5 pt-8'>
              <DashboardGrid readonly>
                {widgets.map(widget => {
                  const Component = WIDGET_COMPONENTS[widget.type];
                  if (!Component) return null;
                  return (
                    <GridItem key={widget.id} id={widget.id}>
                      <Component />
                    </GridItem>
                  );
                })}
              </DashboardGrid>
            </div>
          </div>

          {/* Indicateur discret "Toucher pour quitter" */}
          <div
            className='absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none'
            style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.08em' }}
          >
            TOUCHER POUR QUITTER
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

> **Note sur `DashboardGrid readonly`** : ajouter une prop `readonly?: boolean` à `DashboardGrid`
> qui désactive les handles de drag et les overlays d'édition. Les widgets sont juste affichés
> à leurs positions, sans interaction RGL.

---

## Étape 6 : Modal de configuration WallPanelConfigModal

### `src/components/wallpanel/WallPanelConfigModal.tsx` (NOUVEAU)

```typescript
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, Trash2, Clock, Image, Layers, Settings2 } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { cn } from '@/lib/utils';

type Tab = 'activation' | 'background' | 'widgets' | 'style';

interface WallPanelConfigModalProps {
  onClose: () => void;
}

export function WallPanelConfigModal({ onClose }: WallPanelConfigModalProps) {
  const { config, updateConfig, activate, wallPanelLayout } = useWallPanel();
  const [tab, setTab] = useState<Tab>('activation');
  const [newUrl, setNewUrl] = useState('');

  const handleDemo = () => {
    onClose();
    setTimeout(activate, 300); // attendre la fermeture du modal
  };

  const addImageUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    updateConfig({ image_urls: [...config.image_urls, trimmed] });
    setNewUrl('');
  };

  const removeImageUrl = (idx: number) => {
    updateConfig({ image_urls: config.image_urls.filter((_, i) => i !== idx) });
  };

  const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: 'activation',  label: 'Activation',  icon: Clock },
    { id: 'background',  label: 'Fond',         icon: Image },
    { id: 'widgets',     label: 'Widgets',      icon: Layers },
    { id: 'style',       label: 'Style',        icon: Settings2 },
  ];

  return (
    <>
      <motion.div
        className='fixed inset-0 z-[110] bg-black/60'
        style={{ backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className='fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none'
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className='pointer-events-auto w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col'
          style={{ background: 'rgba(8,12,35,0.97)', backdropFilter: 'blur(24px)', maxHeight: 'min(680px,calc(100vh - 32px))' }}
        >
          {/* Header */}
          <div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 shrink-0'>
            <div>
              <h2 className='text-white font-semibold text-base'>WallPanel</h2>
              <p className='text-white/25 text-[11px] mt-0.5'>Écran de veille avec widgets</p>
            </div>
            <div className='flex items-center gap-2'>
              {/* Bouton Démo */}
              <button
                onClick={handleDemo}
                className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors'
                style={{ background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.35)', color: '#d8b4fe' }}
              >
                <Play size={12} />
                Démo
              </button>
              <button onClick={onClose} className='p-1.5 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/8 transition-colors'>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className='flex items-center gap-1 px-4 py-2.5 border-b border-white/6 shrink-0'>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all',
                  tab === t.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/30 hover:text-white/55 hover:bg-white/5',
                )}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className='flex-1 overflow-y-auto px-5 py-4 space-y-5'>
            {/* ── ACTIVATION ── */}
            {tab === 'activation' && (
              <>
                <label className='flex items-center justify-between'>
                  <div>
                    <p className='text-white/80 text-sm font-medium'>Activer l'écran de veille</p>
                    <p className='text-white/28 text-xs mt-0.5'>Activation automatique après inactivité</p>
                  </div>
                  <input
                    type='checkbox'
                    checked={config.enabled}
                    onChange={e => updateConfig({ enabled: e.target.checked })}
                    className='w-4 h-4 accent-purple-500'
                  />
                </label>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    Délai d'inactivité : <span className='text-white/80'>{config.idle_time}s</span>
                  </label>
                  <input
                    type='range'
                    min={30} max={1800} step={30}
                    value={config.idle_time}
                    onChange={e => updateConfig({ idle_time: Number(e.target.value) })}
                    className='w-full accent-purple-500'
                    disabled={!config.enabled}
                  />
                  <div className='flex justify-between text-white/18 text-[10px] mt-0.5'>
                    <span>30s</span><span>5min</span><span>15min</span><span>30min</span>
                  </div>
                </div>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1'>
                    Entité HA (optionnelle)
                  </label>
                  <input
                    type='text'
                    value={config.screensaver_entity ?? ''}
                    onChange={e => updateConfig({ screensaver_entity: e.target.value || undefined })}
                    placeholder='input_boolean.wallpanel_screensaver'
                    className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/70 text-sm outline-none focus:border-white/20'
                  />
                  <p className='text-white/20 text-[10px] mt-1'>
                    Si définie, HA peut déclencher l'écran de veille via cette entité
                  </p>
                </div>

                <div className='p-3 rounded-xl border border-purple-500/15 bg-purple-500/5'>
                  <p className='text-white/40 text-xs leading-relaxed'>
                    <span className='text-purple-300/70 font-medium'>Activation forcée</span> — ajoutez
                    <code className='mx-1 px-1.5 py-0.5 rounded bg-white/8 text-purple-200/70 text-[10px]'>?wp_enabled=true</code>
                    à l'URL pour activer immédiatement (utile pour tablette murale).
                  </p>
                </div>
              </>
            )}

            {/* ── FOND ── */}
            {tab === 'background' && (
              <>
                {/* Liste d'URLs */}
                <div>
                  <p className='text-white/55 text-xs font-medium mb-2'>Images de fond</p>
                  <div className='space-y-1.5 mb-2'>
                    {config.image_urls.map((url, i) => (
                      <div key={i} className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/7 group'>
                        <span className='flex-1 truncate text-white/55 text-xs font-mono'>{url}</span>
                        <button onClick={() => removeImageUrl(i)} className='text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100'>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {config.image_urls.length === 0 && (
                      <p className='text-white/18 text-xs text-center py-3'>Aucune image — fond dégradé utilisé</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addImageUrl()}
                      placeholder='https://... ou media-source://...'
                      className='flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/70 text-xs outline-none focus:border-white/20'
                    />
                    <button
                      onClick={addImageUrl}
                      className='px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors'
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1'>Ajustement</label>
                    <select
                      value={config.image_fit}
                      onChange={e => updateConfig({ image_fit: e.target.value as any })}
                      className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/70 text-xs outline-none'
                    >
                      <option value='cover'>Cover (recadré)</option>
                      <option value='contain'>Contain (entier)</option>
                      <option value='fill'>Fill (étiré)</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1'>Ordre</label>
                    <select
                      value={config.media_order}
                      onChange={e => updateConfig({ media_order: e.target.value as any })}
                      className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/70 text-xs outline-none'
                    >
                      <option value='random'>Aléatoire</option>
                      <option value='sequential'>Séquentiel</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    Durée par image : <span className='text-white/80'>{config.image_duration}s</span>
                  </label>
                  <input
                    type='range' min={5} max={300} step={5}
                    value={config.image_duration}
                    onChange={e => updateConfig({ image_duration: Number(e.target.value) })}
                    className='w-full accent-purple-500'
                  />
                </div>
              </>
            )}

            {/* ── WIDGETS ── */}
            {tab === 'widgets' && (
              <div className='space-y-3'>
                <p className='text-white/35 text-xs leading-relaxed'>
                  Les widgets sont disposés librement sur l'écran de veille via le même
                  système RGL que le dashboard principal. Cliquez sur <strong className='text-white/55'>Modifier</strong> pour
                  passer en mode édition de l'overlay.
                </p>
                <div className='p-3 rounded-xl border border-white/8 bg-white/3 text-center'>
                  <p className='text-white/22 text-xs mb-2'>
                    {wallPanelLayout.widgets.lg.length} widget{wallPanelLayout.widgets.lg.length !== 1 ? 's' : ''} configuré{wallPanelLayout.widgets.lg.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={handleDemo}
                    className='text-xs px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors'
                  >
                    Ouvrir l'aperçu pour éditer
                  </button>
                </div>
                <p className='text-white/20 text-[11px] leading-relaxed'>
                  Astuce : dans l'aperçu, activez le mode édition (crayon) pour ajouter
                  et repositionner les widgets directement sur le fond.
                </p>
              </div>
            )}

            {/* ── STYLE ── */}
            {tab === 'style' && (
              <>
                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    Flou de fond : <span className='text-white/80'>{config.style.backgroundBlur ?? 0}px</span>
                  </label>
                  <input
                    type='range' min={0} max={40} step={2}
                    value={config.style.backgroundBlur ?? 0}
                    onChange={e => updateConfig({ style: { ...config.style, backgroundBlur: Number(e.target.value) } })}
                    className='w-full accent-purple-500'
                  />
                </div>
                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    Largeur boîte info : <span className='text-white/80'>{config.style.infoBoxWidth ?? 380}px</span>
                  </label>
                  <input
                    type='range' min={200} max={600} step={10}
                    value={config.style.infoBoxWidth ?? 380}
                    onChange={e => updateConfig({ style: { ...config.style, infoBoxWidth: Number(e.target.value) } })}
                    className='w-full accent-purple-500'
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
```

---

## Étape 7 : Bouton WallPanel dans PageTabs

Modifier `src/components/layout/PageTabs.tsx` pour ajouter le bouton WallPanel à gauche
de tous les onglets en mode édition (ou toujours visible si déjà configuré).

```typescript
// Ajouter l'import
import { useWallPanel } from '@/context/WallPanelContext';
import { Monitor } from 'lucide-react';
import { WallPanelConfigModal } from '@/components/wallpanel/WallPanelConfigModal';
import { AnimatePresence } from 'framer-motion';

// Dans le composant PageTabs, ajouter :
const { isConfigured } = useWallPanel();
const [showWpConfig, setShowWpConfig] = useState(false);

// Dans le JSX, AVANT le {sortedPages.map(...)}, insérer :
{/* Bouton WallPanel — toujours à gauche */}
{(isEditMode || isConfigured) && (
  <button
    onClick={() => setShowWpConfig(true)}
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
      isConfigured
        ? 'text-purple-300/70 bg-purple-500/8 border border-purple-500/20 hover:bg-purple-500/15'
        : 'text-white/30 border border-dashed border-white/15 hover:border-purple-500/30 hover:text-purple-300/60',
    )}
  >
    <Monitor size={16} />
    <span className='uppercase tracking-wider text-xs'>
      {isConfigured ? 'WallPanel' : '+ WallPanel'}
    </span>
  </button>
)}

// Et le modal :
<AnimatePresence>
  {showWpConfig && <WallPanelConfigModal onClose={() => setShowWpConfig(false)} />}
</AnimatePresence>
```

---

## Étape 8 : Intégrer dans Dashboard.tsx

### Modifications dans `Dashboard.tsx`

```typescript
// 1. Nouveaux imports
import { WallPanelProvider, useWallPanel } from '@/context/WallPanelContext';
import { WallPanelOverlay } from '@/components/wallpanel/WallPanelOverlay';
import { useIdleDetector } from '@/hooks/useIdleDetector';

// 2. Nouveau composant pour le détecteur d'inactivité (doit être dans le Provider)
function IdleWatcher() {
  const { config, activate, deactivate, isActive } = useWallPanel();
  useIdleDetector({
    idleTime: config.idle_time,
    enabled: config.enabled && !isActive,
    onIdle: activate,
    onActive: () => {}, // la désactivation se fait manuellement (clic/tap)
  });
  return null;
}

// 3. Dans DashboardContent(), ajouter :
//    - <IdleWatcher /> n'importe où dans le render
//    - <WallPanelOverlay /> à la fin (hors du scroll container)

// 4. Dans Dashboard() :
// Wrapper avec WallPanelProvider en récupérant les données depuis useDashboardConfig
return (
  <PageProvider initialPages={pages}>
    <DashboardLayoutProvider initialLayouts={allLayouts} initialAllWidgetConfigs={allWidgetConfigs}>
      <WallPanelProvider initialConfig={wallPanelConfig} initialLayout={wallPanelLayout}>
        <PanelProvider>
          <DashboardContent />
          <WallPanelOverlay />
        </PanelProvider>
      </WallPanelProvider>
    </DashboardLayoutProvider>
  </PageProvider>
);
```

---

## Étape 9 : Persister la config WallPanel

### Format de config v2 étendu (`DashboardConfigV2`)

Modifier `DashboardLayoutContext.tsx` pour ajouter les champs optionnels :

```typescript
export interface DashboardConfigV2 {
  version: 2;
  pages: Page[];
  layouts: Record<string, DashboardLayout>;
  widgetConfigs: Record<string, WidgetConfigs>;
  /** Config WallPanel (optionnelle, rétrocompatible) */
  wallPanel?: {
    config: WallPanelConfig;
    layout: DashboardLayout;
    widgetConfigs: WidgetConfigs;
  };
}
```

### Dans `useDashboardConfig.ts`

```typescript
// Ajouter dans l'état
const [wallPanelConfig, setWallPanelConfig] = useState<WallPanelConfig>(DEFAULT_WALLPANEL_CONFIG);
const [wallPanelLayout, setWallPanelLayout] = useState<DashboardLayout>({ ...DEFAULT_LAYOUT, widgets: { lg: [], md: [], sm: [] } });

// Dans le fetch de config
const v2 = migrateConfig(data);
// ...
if (v2.wallPanel) {
  setWallPanelConfig(v2.wallPanel.config);
  setWallPanelLayout(v2.wallPanel.layout);
}

// Exposer dans le return du hook
return { ..., wallPanelConfig, wallPanelLayout, setWallPanelConfig };

// Inclure dans saveConfig depuis Dashboard.tsx :
await saveConfig({
  version: 2,
  pages,
  layouts: allLayouts,
  widgetConfigs: allWidgetConfigsByPage,
  wallPanel: {
    config: wpConfig,
    layout: wpLayout,
    widgetConfigs: {},
  },
});
```

---

## Étape 10 : Ajouter `readonly` prop à DashboardGrid

Dans `src/components/layout/DashboardGrid.tsx`, ajouter un prop `readonly` pour désactiver
les handles RGL et les overlays d'édition :

```typescript
interface DashboardGridProps {
  children: ReactNode;
  readonly?: boolean; // NEW — désactive drag/resize/edit overlays
}

// Dans le composant, conditionner isDraggable / isResizable :
isDraggable={!readonly && isEditMode}
isResizable={!readonly && isEditMode}

// Et dans GridItem, ne pas rendre l'overlay d'édition si readonly :
const { isEditMode } = useDashboardLayout();
const { readonly } = useContext(DashboardGridContext); // nouveau context interne
```

---

## Vérification

- [ ] L'écran de veille s'active après `idle_time` secondes sans interaction
- [ ] Un clic/tap n'importe où désactive l'overlay (retour au dashboard)
- [ ] `?wp_enabled=true` dans l'URL active immédiatement l'overlay
- [ ] Le bouton **+ WallPanel** apparaît en mode édition (à gauche des onglets)
- [ ] Si déjà configuré, le bouton **WallPanel** est visible en permanence
- [ ] Le bouton **Démo** ferme le modal et affiche l'overlay
- [ ] Les widgets sur l'overlay sont repositionnables (mode édition de l'overlay)
- [ ] Le diaporama défile entre les images avec crossfade
- [ ] La config est sauvegardée dans `wallPanel.config` du JSON
- [ ] Echap désactive l'overlay

## Améliorations futures

- [ ] Mode édition dédié pour les widgets de l'overlay (grille transparente)
- [ ] Support `media-source://` HA via proxy serveur (les URL Synology NAS nécessitent un token)
- [ ] Entité HA `screensaver_entity` : watch via WebSocket HA pour activation/désactivation depuis HA
- [ ] Transition de page animée (fade/slide) avant l'overlay
- [ ] Widgets spéciaux pour le WallPanel : `WallClockWidget` (grand affichage, style nixie)
- [ ] Support météo en fond via API open-meteo sans entité HA

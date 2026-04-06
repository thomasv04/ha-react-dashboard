import React, { Component, type ReactNode, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Plus, ChevronRight, MousePointerClick,
  Thermometer, Lightbulb, Cloud, Zap, Video,
  LayoutGrid, Grip, ArrowUpDown, Users, Clock, Activity, Code2, Gauge,
} from 'lucide-react';
import { useDashboardLayout, WIDGET_CATALOG, type GridWidget } from '@/context/DashboardLayoutContext';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { cn } from '@/lib/utils';

// Widget components for live previews
import { WeatherCard }       from '@/components/cards/WeatherCard/WeatherCard';
import { CameraCard }        from '@/components/cards/CameraCard/CameraCard';
import { ThermostatCard }    from '@/components/cards/ThermostatCard/ThermostatCard';
import { RoomsGrid }         from '@/components/cards/RoomsGrid/RoomsGrid';
import { ShortcutsCard }     from '@/components/cards/ShortcutsCard/ShortcutsCard';
import { TempoCard }         from '@/components/cards/TempoCard/TempoCard';
import { EnergyCard }        from '@/components/cards/EnergyCard/EnergyCard';
import { GreetingCard }      from '@/components/cards/GreetingCard/GreetingCard';
import { ActivityBar }       from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard }        from '@/components/cards/SensorCard/SensorCard';
import { LightCard }         from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard }  from '@/components/cards/PersonStatus/PersonStatusCard';
import { CoverCard }         from '@/components/cards/CoverCard/CoverCard';
import { TemplateCard }      from '@/components/cards/TemplateCard/TemplateCard';

// ── Widget component registry ─────────────────────────────────────────────────

const PREVIEW_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
  weather:    WeatherCard,
  camera:     CameraCard,
  thermostat: ThermostatCard,
  rooms:      RoomsGrid,
  shortcuts:  ShortcutsCard,
  tempo:      TempoCard,
  energy:     EnergyCard,
  greeting:   GreetingCard,
  activity:   ActivityBar,
  sensor:     SensorCard,
  light:      LightCard,
  person:     PersonStatusCard,
  cover:      CoverCard,
  template:   TemplateCard,
};

// ── Preview dimension engine ──────────────────────────────────────────────────

/** Approximate pixel size per grid unit for preview scaling */
const COL_PX = 90;
const ROW_PX = 90;
/** Maximum visual display area for the preview (right panel minus padding) */
const PREVIEW_MAX_W = 390;
const PREVIEW_MAX_H = 265;
/** Allow moderate upscaling for small/thin widgets */
const MAX_SCALE = 1.5;

/** Grid hints for widget types not present in WIDGET_CATALOG */
const CATALOG_HINTS: Partial<Record<GridWidget['type'], { w: number; h: number }>> = {
  greeting: { w: 4, h: 1 },
  activity: { w: 8, h: 1 },
};

interface PreviewDims {
  /** Natural render size (before CSS transform) */
  renderW: number;
  renderH: number;
  /** CSS transform scale factor */
  scale: number;
  /** Visual size after scaling (used for the outer container) */
  displayW: number;
  displayH: number;
}

function getPreviewDims(type: GridWidget['type']): PreviewDims {
  const catalogEntry = WIDGET_CATALOG.find(c => c.type === type);
  const hint = CATALOG_HINTS[type];
  const lgSize = catalogEntry?.lg ?? hint ?? { w: 3, h: 2 };
  const naturalW = lgSize.w * COL_PX;
  const naturalH = lgSize.h * ROW_PX;
  const scale = Math.min(
    PREVIEW_MAX_W / naturalW,
    PREVIEW_MAX_H / naturalH,
    MAX_SCALE,
  );
  return {
    renderW: naturalW,
    renderH: naturalH,
    scale,
    displayW: Math.round(naturalW * scale),
    displayH: Math.round(naturalH * scale),
  };
}

// ── Error boundary ────────────────────────────────────────────────────────────

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className='h-full flex items-center justify-center'>
          <span className='text-white/15 text-[11px]'>Aperçu indisponible</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Widget metadata ───────────────────────────────────────────────────────────

type Category = 'all' | 'sensors' | 'lights' | 'climate' | 'energy' | 'cameras' | 'home' | 'system';

interface WidgetMeta {
  type: GridWidget['type'];
  label: string;
  description: string;
  category: Category;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  color: string;
}

const WIDGET_META: WidgetMeta[] = [
  { type: 'sensor',    label: 'Capteur',           description: "N'importe quel capteur HA : température, humidité, puissance, binaire...", category: 'sensors', icon: Gauge,       color: '#3b82f6' },
  { type: 'light',     label: 'Lumière',            description: 'Contrôle une lumière ou un groupe avec variateur de luminosité.',         category: 'lights',  icon: Lightbulb,   color: '#eab308' },
  { type: 'weather',   label: 'Météo',              description: 'Conditions météo actuelles et prévisions sur plusieurs jours.',           category: 'climate', icon: Cloud,       color: '#0ea5e9' },
  { type: 'thermostat',label: 'Thermostat',         description: 'Contrôle un thermostat climate.xxx avec la température cible.',           category: 'climate', icon: Thermometer, color: '#f97316' },
  { type: 'energy',    label: 'Énergie',            description: "Vue d'ensemble production solaire, batterie, consommation maison.",       category: 'energy',  icon: Zap,         color: '#22c55e' },
  { type: 'tempo',     label: 'Tempo EDF',          description: 'Couleur du jour Tempo RTE et heures pleines/creuses.',                   category: 'energy',  icon: Activity,    color: '#ef4444' },
  { type: 'camera',    label: 'Caméra',             description: "Flux vidéo en direct d'une ou plusieurs caméras Frigate/RTSP.",          category: 'cameras', icon: Video,       color: '#a855f7' },
  { type: 'rooms',     label: 'Pièces',             description: 'Grille de pièces avec température, lumières et accès rapide aux panneaux.', category: 'home', icon: LayoutGrid,  color: '#6366f1' },
  { type: 'shortcuts', label: 'Raccourcis',         description: 'Boutons rapides pour ouvrir les panneaux lumières, volets, sécurité...', category: 'home',    icon: Grip,        color: '#14b8a6' },
  { type: 'cover',     label: 'Volet',              description: 'Contrôle un volet ou store avec slider de position et boutons.',         category: 'home',    icon: ArrowUpDown, color: '#64748b' },
  { type: 'person',    label: 'Personnes',          description: 'Affiche la présence et localisation des personnes du foyer.',            category: 'home',    icon: Users,       color: '#ec4899' },
  { type: 'greeting',  label: 'Horloge',            description: 'Horloge et message de bienvenue personnalisé.',                         category: 'system',  icon: Clock,       color: '#f59e0b' },
  { type: 'activity',  label: "Barre d'activité",   description: "Bandeau d'états rapides : alarme, poêle, batterie, Tempo...",           category: 'system',  icon: Activity,    color: '#8b5cf6' },
  { type: 'template',  label: 'Template',           description: 'Widget entièrement personnalisable avec templates Jinja2/Nunjucks.',     category: 'sensors', icon: Code2,       color: '#06b6d4' },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',     label: 'Tous' },
  { id: 'sensors', label: 'Capteurs' },
  { id: 'lights',  label: 'Lumières' },
  { id: 'climate', label: 'Climat' },
  { id: 'energy',  label: 'Énergie' },
  { id: 'cameras', label: 'Caméras' },
  { id: 'home',    label: 'Maison' },
  { id: 'system',  label: 'Système' },
];

// ── Right panel: live preview ─────────────────────────────────────────────────

function PreviewPanel({
  meta,
  onAdd,
}: {
  meta: WidgetMeta | null;
  onAdd: (type: GridWidget['type']) => void;
}) {
  const catalogEntry = meta ? WIDGET_CATALOG.find(c => c.type === meta.type) : null;
  const Component    = meta ? PREVIEW_COMPONENTS[meta.type] : null;
  const dims         = meta ? getPreviewDims(meta.type) : null;

  return (
    <div className='flex flex-col h-full'>
      <AnimatePresence mode='wait'>
        {!meta ? (
          <motion.div
            key='empty'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='flex-1 flex flex-col items-center justify-center gap-4 text-center px-8'
          >
            <div
              className='p-5 rounded-2xl'
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <MousePointerClick size={30} className='text-white/15' />
            </div>
            <div>
              <p className='text-white/30 text-sm font-medium'>Sélectionne un widget</p>
              <p className='text-white/15 text-xs mt-1'>pour voir l'aperçu en direct</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={meta.type}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='flex flex-col h-full'
          >
            {/* ── Live widget preview ─────────────────────────────── */}
            {dims && (
              <div
                className='flex items-center justify-center shrink-0 mx-5 mt-5'
                style={{ minHeight: dims.displayH }}
              >
                <div
                  className='relative overflow-hidden rounded-2xl'
                  style={{
                    width: dims.displayW,
                    height: dims.displayH,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {Component ? (
                    // Inner element rendered at natural grid size, scaled down to fill the display box.
                    // transformOrigin: 'top left' ensures the top-left corner stays anchored,
                    // and since displayW = renderW * scale the content fills the container exactly.
                    <div
                      style={{
                        width: dims.renderW,
                        height: dims.renderH,
                        transform: `scale(${dims.scale})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                    >
                      <WidgetIdProvider id={meta.type}>
                        <PreviewErrorBoundary>
                          <Component />
                        </PreviewErrorBoundary>
                      </WidgetIdProvider>
                    </div>
                  ) : (
                    <div className='h-full flex items-center justify-center'>
                      <span className='text-white/15 text-xs'>Aucun aperçu</span>
                    </div>
                  )}
                  {/* En direct badge */}
                  <div
                    className='absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium'
                    style={{
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.35)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    En direct
                  </div>
                </div>
              </div>
            )}

            {/* ── Widget info ─────────────────────────────────────── */}
            <div className='px-5 pt-4 space-y-3 flex-1 min-h-0'>
              <div className='flex items-center gap-3'>
                <div
                  className='p-2.5 rounded-xl shrink-0'
                  style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}35` }}
                >
                  <meta.icon size={18} color={meta.color} />
                </div>
                <div>
                  <h3 className='text-white font-semibold text-sm'>{meta.label}</h3>
                  {catalogEntry && (
                    <span className='text-white/22 text-[10px] font-mono'>
                      {catalogEntry.lg.w} col × {catalogEntry.lg.h} rangée{catalogEntry.lg.h > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <p className='text-white/35 text-[12px] leading-relaxed'>{meta.description}</p>
            </div>

            {/* ── Add button ──────────────────────────────────────── */}
            <div className='px-5 pb-5 pt-3 shrink-0'>
              <button
                onClick={() => onAdd(meta.type)}
                className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors'
                style={{
                  background: 'rgba(59,130,246,0.25)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#93c5fd',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.42)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.25)'; }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Ajouter au dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function ListRow({ meta, selected, onClick }: { meta: WidgetMeta; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
        selected
          ? 'bg-white/8 border border-white/12'
          : 'border border-transparent hover:bg-white/5 hover:border-white/6',
      )}
    >
      <div
        className='p-2 rounded-lg shrink-0'
        style={{
          background: selected ? `${meta.color}28` : `${meta.color}12`,
          border: `1px solid ${meta.color}${selected ? '45' : '22'}`,
        }}
      >
        <meta.icon size={15} color={meta.color} />
      </div>
      <span className={cn('text-sm font-medium flex-1 truncate transition-colors', selected ? 'text-white' : 'text-white/55')}>
        {meta.label}
      </span>
      <ChevronRight size={14} className={cn('shrink-0 transition-colors', selected ? 'text-white/40' : 'text-white/12')} />
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface AddWidgetModalProps {
  onClose: () => void;
}

export function AddWidgetModal({ onClose }: AddWidgetModalProps) {
  const { addWidgetByType } = useDashboardLayout();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<GridWidget['type'] | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return WIDGET_META.filter(meta => {
      const matchCat    = category === 'all' || meta.category === category;
      const matchSearch = !q || meta.label.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const selectedMeta = selected ? WIDGET_META.find(m => m.type === selected) ?? null : null;

  const handleAdd = (type: GridWidget['type']) => {
    addWidgetByType(type);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key='add-modal-backdrop'
        className='fixed inset-0 z-[60] bg-black/60'
        style={{ backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        key='add-modal'
        className='fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none'
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className='pointer-events-auto w-full flex overflow-hidden rounded-3xl border border-white/10 shadow-2xl'
          style={{
            background: 'rgba(8, 12, 35, 0.97)',
            backdropFilter: 'blur(24px)',
            maxHeight: 'min(700px, calc(100vh - 32px))',
            maxWidth: 760,
            height: 620,
          }}
        >
          {/* ── LEFT: list ─────────────────────────────────────────── */}
          <div className='flex flex-col w-[340px] shrink-0 border-r border-white/8'>
            {/* Header + search */}
            <div className='px-5 pt-5 pb-3 border-b border-white/8 shrink-0 space-y-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-white font-semibold text-base'>Ajouter un widget</h2>
                  <p className='text-white/22 text-[11px] mt-0.5'>Illimité · cliquez pour aperçu</p>
                </div>
                <button
                  onClick={onClose}
                  className='p-1.5 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/8 transition-colors'
                >
                  <X size={15} />
                </button>
              </div>
              <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 focus-within:border-white/20 transition-colors'>
                <Search size={13} className='text-white/28 shrink-0' />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder='Rechercher un widget...'
                  className='bg-transparent text-sm text-white/80 outline-none flex-1 placeholder:text-white/18'
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className='text-white/22 hover:text-white/55 transition-colors'>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills */}
            <div className='flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-white/6 shrink-0'>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all shrink-0',
                    category === cat.id
                      ? 'bg-blue-500/22 text-blue-300 border border-blue-500/32'
                      : 'bg-white/4 text-white/30 border border-transparent hover:text-white/55 hover:bg-white/6',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className='flex-1 overflow-y-auto px-3 py-3 space-y-0.5'>
              {filtered.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10'>
                  <Search size={22} className='text-white/10 mb-2' />
                  <p className='text-white/18 text-xs'>Aucun résultat</p>
                </div>
              ) : (
                filtered.map(meta => (
                  <ListRow
                    key={meta.type}
                    meta={meta}
                    selected={selected === meta.type}
                    onClick={() => setSelected(meta.type)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: preview ─────────────────────────────────────── */}
          <div className='flex-1 min-w-0'>
            <PreviewPanel meta={selectedMeta} onAdd={handleAdd} />
          </div>
        </div>
      </motion.div>
    </>
  );
}
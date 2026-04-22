import { Component, useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MousePointerClick, ArrowLeft, Search, Check } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';
import { WIDGET_CATALOG, type GridWidget } from '@/context/DashboardLayoutContext';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { PREVIEW_COMPONENTS } from '@/config/widget-registry';
import { type WidgetMeta, getPreviewDims } from './widget-meta';

// ── Error boundary ────────────────────────────────────────────────────────────

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) {
      return (
        <div className='h-full flex items-center justify-center'>
          <span className='text-white/15 text-[11px]'>Preview unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Entity picker step ────────────────────────────────────────────────────────

function EntityPickerStep({ meta, onBack, onConfirm }: { meta: WidgetMeta; onBack: () => void; onConfirm: (entityId: string) => void }) {
  const allEntities = useHass(s => s.entities);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState('');

  const entities = useMemo(() => {
    const domain = meta.entityDomain!;
    const list = Object.entries(allEntities ?? {})
      .filter(([id]) => id.startsWith(`${domain}.`))
      .map(([id, e]) => ({ id, name: (e.attributes?.friendly_name as string | undefined) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(e => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q));
  }, [allEntities, meta.entityDomain, search]);

  return (
    <motion.div
      key='entity-step'
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className='flex flex-col h-full'
    >
      {/* Header */}
      <div className='flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/8 shrink-0'>
        <button onClick={onBack} className='p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors'>
          <ArrowLeft size={14} />
        </button>
        <div>
          <p className='text-white/80 text-sm font-semibold'>Choisir une entité</p>
          <p className='text-white/28 text-[10px] font-mono'>{meta.entityDomain}.*</p>
        </div>
      </div>

      {/* Search */}
      <div className='px-4 py-2.5 shrink-0'>
        <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 focus-within:border-white/20 transition-colors'>
          <Search size={12} className='text-white/28 shrink-0' />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher ${meta.entityDomain}...`}
            className='bg-transparent text-xs text-white/80 outline-none flex-1 placeholder:text-white/22'
          />
        </div>
      </div>

      {/* Entity list */}
      <div className='flex-1 overflow-y-auto px-3 space-y-0.5 min-h-0 pb-2'>
        {entities.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full gap-2'>
            <Search size={20} className='text-white/10' />
            <p className='text-white/20 text-xs'>Aucune entité {meta.entityDomain} trouvée</p>
          </div>
        ) : (
          entities.map(e => (
            <button
              key={e.id}
              onClick={() => setPicked(e.id)}
              className='w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all'
              style={{
                background: picked === e.id ? `${meta.color}18` : 'transparent',
                border: `1px solid ${picked === e.id ? meta.color + '40' : 'transparent'}`,
              }}
            >
              <div
                className='w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all'
                style={{
                  borderColor: picked === e.id ? meta.color : 'rgba(255,255,255,0.18)',
                  background: picked === e.id ? meta.color : 'transparent',
                }}
              >
                {picked === e.id && <Check size={9} className='text-white' strokeWidth={3} />}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-white/80 text-xs font-medium truncate'>{e.name}</p>
                <p className='text-white/28 text-[10px] font-mono truncate'>{e.id}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Confirm button */}
      <div className='px-4 pb-4 pt-2 shrink-0'>
        <button
          onClick={() => picked && onConfirm(picked)}
          disabled={!picked}
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all'
          style={{
            background: picked ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${picked ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: picked ? '#93c5fd' : 'rgba(255,255,255,0.2)',
            cursor: picked ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Ajouter au dashboard
        </button>
      </div>
    </motion.div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

export function PreviewPanel({
  meta,
  onAdd,
}: {
  meta: WidgetMeta | null;
  onAdd: (type: GridWidget['type'], entityId?: string, entityConfigKey?: string) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<'info' | 'entity'>('info');
  const catalogEntry = meta ? WIDGET_CATALOG.find(c => c.type === meta.type) : null;
  const Component = meta ? PREVIEW_COMPONENTS[meta.type] : null;
  const dims = meta ? getPreviewDims(meta.type) : null;

  // Reset step when widget selection changes
  const handleMetaChange = (newMeta: WidgetMeta | null) => {
    if (newMeta?.type !== meta?.type) setStep('info');
  };
  void handleMetaChange; // used via key below

  const handleAddClick = () => {
    if (!meta) return;
    if (meta.entityDomain) {
      setStep('entity');
    } else {
      onAdd(meta.type);
    }
  };

  const handleEntityConfirm = (entityId: string) => {
    if (!meta) return;
    onAdd(meta.type, entityId, meta.entityConfigKey ?? 'entityId');
  };

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      <AnimatePresence mode='wait'>
        {!meta ? (
          <motion.div
            key='empty'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='flex-1 flex flex-col items-center justify-center gap-4 text-center px-8'
          >
            <div className='p-5 rounded-2xl' style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <MousePointerClick size={30} className='text-white/15' />
            </div>
            <div>
              <p className='text-white/30 text-sm font-medium'>{t('layout.selectWidget')}</p>
              <p className='text-white/15 text-xs mt-1'>{t('layout.selectWidgetSub')}</p>
            </div>
          </motion.div>
        ) : step === 'entity' ? (
          <EntityPickerStep key={`${meta.type}-entity`} meta={meta} onBack={() => setStep('info')} onConfirm={handleEntityConfirm} />
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
              <div className='flex items-center justify-center shrink-0 mx-5 mt-5' style={{ minHeight: dims.displayH }}>
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
                      <span className='text-white/15 text-xs'>{t('layout.noPreview')}</span>
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
                    {t('layout.live')}
                  </div>
                </div>
              </div>
            )}

            {/* ── Widget info ─────────────────────────────────────── */}
            <div className='px-5 pt-4 space-y-3 flex-1 min-h-0'>
              <div className='flex items-center gap-3'>
                <div className='p-2.5 rounded-xl shrink-0' style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}35` }}>
                  <meta.icon size={18} color={meta.color} />
                </div>
                <div>
                  <h3 className='text-white font-semibold text-sm'>{meta.label}</h3>
                  {catalogEntry && (
                    <span className='text-white/22 text-[10px] font-mono'>
                      {catalogEntry.lg.w} col × {catalogEntry.lg.h} row{catalogEntry.lg.h > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <p className='text-white/35 text-[12px] leading-relaxed'>{meta.description}</p>
            </div>

            {/* ── Add button ──────────────────────────────────────── */}
            <div className='px-5 pb-5 pt-3 shrink-0'>
              <button
                onClick={handleAddClick}
                className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors'
                style={{
                  background: 'rgba(59,130,246,0.25)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#93c5fd',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.42)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.25)';
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                {meta.entityDomain ? 'Choisir une entité →' : t('layout.addToDashboard')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

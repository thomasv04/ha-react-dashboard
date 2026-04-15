import { Component, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MousePointerClick } from 'lucide-react';
import { WIDGET_CATALOG, type GridWidget } from '@/context/DashboardLayoutContext';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { PREVIEW_COMPONENTS } from '@/config/widget-registry';
import { type WidgetMeta, getPreviewDims } from './widget-meta';

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

// ── Right panel: live preview ─────────────────────────────────────────────────

export function PreviewPanel({
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

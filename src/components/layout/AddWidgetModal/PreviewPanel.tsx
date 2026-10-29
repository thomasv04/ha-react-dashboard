import { Component, useEffect, useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MousePointerClick, ArrowLeft, Search, Check } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';
import { MOCK_ENTITIES } from '@/mocks/hassEntities';
import type { GridWidget } from '@/context/DashboardLayoutContext';
import { WIDGET_CATALOG } from '@/widgets';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { WidgetConfigOverride } from '@/context/WidgetConfigContext';
import type { WidgetConfigs } from '@/types/widget-configs';
import { WIDGET_COMPONENTS } from '@/widgets';
import { type WidgetMeta, getPreviewDims } from './widget-meta';
import { previewConfig } from './preview-config';
import { friendlyName } from '@/lib/ha-service';

// ── Mock HA wrapper ──────────────────────────────────────────────────────────
// Temporarily merges mock entities into the Zustand store so widget previews
// render with sample data instead of showing "entity not found" errors.
// Real HA entities are preserved and take precedence; restored on unmount.

function MockHassWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    const real = (useHass.getState() as { entities?: Record<string, unknown> }).entities ?? {};
    useHass.setState({ entities: { ...MOCK_ENTITIES, ...real } as never });
    return () => {
      useHass.setState({ entities: real as never });
    };
  }, []);
  return <>{children}</>;
}

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
          <span className='text-[var(--ds-ink-muted)] text-[11px]'>Preview unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Entity picker step ────────────────────────────────────────────────────────

function EntityPickerStep({ meta, onBack, onConfirm }: { meta: WidgetMeta; onBack: () => void; onConfirm: (entityId: string) => void }) {
  const { t } = useI18n();
  const allEntities = useHass(s => s.entities);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState('');

  const entities = useMemo(() => {
    const domain = meta.entityDomain!;
    const list = Object.entries(allEntities ?? {})
      .filter(([id]) => id.startsWith(`${domain}.`))
      .map(([id, e]) => ({ id, name: friendlyName(e) ?? id }))
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
      <div className='flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[var(--ds-surface-3)] shrink-0'>
        <button onClick={onBack} className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'>
          <ArrowLeft size={14} />
        </button>
        <div>
          <p className='text-[var(--ds-ink)] text-sm font-semibold'>{t('layout.chooseEntity')}</p>
          <p className='text-[var(--ds-ink-muted)] text-[10px] font-mono'>{meta.entityDomain}.*</p>
        </div>
      </div>

      {/* Search */}
      <div className='px-4 py-2.5 shrink-0'>
        <div className='flex items-center gap-2 px-3 py-1.5 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] focus-within:border-[var(--ds-accent)] transition-colors'>
          <Search size={12} className='text-[var(--ds-ink-muted)] shrink-0' />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('layout.searchInDomain', { domain: meta.entityDomain ?? '' })}
            className='bg-transparent text-xs text-[var(--ds-ink)] outline-none flex-1 placeholder:text-[var(--ds-ink-muted)]'
          />
        </div>
      </div>

      {/* Entity list */}
      <div className='flex-1 overflow-y-auto px-3 space-y-0.5 min-h-0 pb-2'>
        {entities.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full gap-2'>
            <Search size={20} className='text-[var(--ds-ink-muted)]' />
            <p className='text-[var(--ds-ink-muted)] text-xs'>{t('layout.noEntityFound', { domain: meta.entityDomain ?? '' })}</p>
          </div>
        ) : (
          entities.map(e => (
            <button
              key={e.id}
              onClick={() => setPicked(e.id)}
              className='w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ds-radius-md)] text-left transition-all'
              style={{
                background: picked === e.id ? `${meta.color}18` : 'transparent',
                border: `1px solid ${picked === e.id ? meta.color + '40' : 'transparent'}`,
              }}
            >
              <div
                className='w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-all'
                style={{
                  borderColor: picked === e.id ? meta.color : 'var(--ds-surface-3)',
                  background: picked === e.id ? meta.color : 'transparent',
                }}
              >
                {picked === e.id && <Check size={9} className='text-[var(--ds-ink)]' strokeWidth={3} />}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-[var(--ds-ink)] text-xs font-medium truncate'>{e.name}</p>
                <p className='text-[var(--ds-ink-muted)] text-[10px] font-mono truncate'>{e.id}</p>
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
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--ds-radius-md)] text-sm font-semibold transition-all'
          style={{
            background: picked ? 'var(--ds-tile-on)' : 'var(--ds-surface-2)',
            border: `1px solid ${picked ? 'var(--ds-tile-on)' : 'var(--ds-surface-3)'}`,
            color: picked ? 'var(--ds-tile-on-ink)' : 'var(--ds-ink-muted)',
            cursor: picked ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          {t('layout.addToDashboard')}
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
  const Component = meta ? WIDGET_COMPONENTS[meta.type] : null;
  const dims = meta ? getPreviewDims(meta.type) : null;
  const previewConfigs = useMemo(
    () => (meta ? ({ [meta.type]: previewConfig(meta.type, meta.entityDomain) } as unknown as WidgetConfigs) : null),
    [meta]
  );

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
            <div
              className='p-5 rounded-[var(--ds-radius-lg)]'
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-surface-3)' }}
            >
              <MousePointerClick size={30} className='text-[var(--ds-ink-muted)]' />
            </div>
            <div>
              <p className='text-[var(--ds-ink-muted)] text-sm font-medium'>{t('layout.selectWidget')}</p>
              <p className='text-[var(--ds-ink-muted)] text-xs mt-1'>{t('layout.selectWidgetSub')}</p>
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
            {/* `flex-1` : l'aperçu était calé en haut avec sa hauteur exacte, et
                laissait sous lui un grand vide avant la description. Il occupe
                maintenant la place disponible et s'y centre. */}
            {dims && (
              <div className='flex flex-1 items-center justify-center min-h-0 px-6 pt-8 pb-2'>
                {/* Étiquette posée sur le conteneur et non sur le cadre : dans
                    le cadre, qui rogne, elle passait par-dessus le coin de la
                    card — sur l'aspirateur, elle recouvrait la batterie. */}
                <div className='relative shrink-0' style={{ width: dims.displayW }}>
                  <span className='absolute -top-6 right-0 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--ds-ink-muted)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)]'>
                    {t('layout.preview')}
                  </span>
                  <div
                    className='relative overflow-hidden rounded-[var(--ds-radius-lg)]'
                    style={{
                      width: dims.displayW,
                      height: dims.displayH,
                      background: 'var(--ds-surface-2)',
                      border: '1px solid var(--ds-surface-3)',
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
                        <MockHassWrapper>
                          <WidgetConfigOverride configs={previewConfigs!}>
                            <WidgetIdProvider id={meta.type}>
                              <PreviewErrorBoundary>
                                <Component />
                              </PreviewErrorBoundary>
                            </WidgetIdProvider>
                          </WidgetConfigOverride>
                        </MockHassWrapper>
                      </div>
                    ) : (
                      <div className='h-full flex items-center justify-center'>
                        <span className='text-[var(--ds-ink-muted)] text-xs'>{t('layout.noPreview')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Widget info ─────────────────────────────────────── */}
            <div className='px-6 pt-2 shrink-0 space-y-2'>
              <div className='flex items-center gap-2.5'>
                <h3 className='text-[var(--ds-ink)] font-semibold text-[15px] truncate'>{t(meta.label)}</h3>
                {catalogEntry && (
                  <span className='shrink-0 px-2 py-0.5 rounded-md bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)] text-[10px] font-mono'>
                    {catalogEntry.lg.w}×{catalogEntry.lg.h}
                  </span>
                )}
              </div>
              <p className='text-[var(--ds-ink-muted)] text-[12.5px] leading-relaxed'>{t(meta.description)}</p>
            </div>

            {/* ── Add button ──────────────────────────────────────── */}
            <div className='px-6 pb-6 pt-4 shrink-0'>
              <button
                onClick={handleAddClick}
                className='w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--ds-radius-md)] text-sm font-semibold transition-colors bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
              >
                <Plus size={14} strokeWidth={2.5} />
                {meta.entityDomain ? t('layout.chooseEntityArrow') : t('layout.addToDashboard')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

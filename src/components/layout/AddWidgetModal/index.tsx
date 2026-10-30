import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion-tokens';
import { X, Search } from 'lucide-react';
import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import type { WidgetConfig } from '@/types/widget-configs';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { cn } from '@/lib/utils';
import { CATEGORIES, type Category } from './widget-meta';
import { WIDGET_META } from '@/widgets';
import { useI18n } from '@/i18n';
import { PreviewPanel } from './PreviewPanel';
import { WidgetCard } from './WidgetCard';

interface AddWidgetModalProps {
  onClose: () => void;
  /** Le widget ajouté — la colonne d'une page Plan l'y range. */
  onAdded?: (id: string) => void;
  /** Panneau où poser le widget ; le dernier par défaut. */
  panelId?: string;
}

export function AddWidgetModal({ onClose, onAdded, panelId }: AddWidgetModalProps) {
  const { t } = useI18n();
  const { addWidgetByType } = useDashboardLayout();
  const { setEditingWidgetId, updateWidgetConfig } = useWidgetConfig();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<GridWidget['type'] | null>(null);

  const filtered = useMemo(() => {
    const q = search
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    // La recherche portait sur `meta.label` / `meta.description`, qui sont des
    // **clés i18n** (`widgets.weather.label`) : taper « météo » ne renvoyait
    // rien, seul « weather » fonctionnait. On filtre sur le texte traduit, et
    // en ignorant les accents — personne ne tape « énergie » avec l'accent.
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
    return WIDGET_META.filter(meta => {
      const matchCat = category === 'all' || meta.category === category;
      const matchSearch = !q || norm(t(meta.label)).includes(q) || norm(t(meta.description)).includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category, t]);

  const selectedMeta = selected ? (WIDGET_META.find(m => m.type === selected) ?? null) : null;

  const handleAdd = (type: GridWidget['type'], entityId?: string, entityConfigKey?: string) => {
    const id = addWidgetByType(type, panelId);
    if (id && entityId && entityConfigKey) {
      const defaultCfg = (DEFAULT_WIDGET_CONFIGS as Record<string, WidgetConfig>)[type] ?? {};
      // Une card qui agrège (agenda, pièce) attend une liste : y poser la
      // chaîne telle quelle laissait la card vide, avec une entité choisie.
      const isList = Array.isArray((defaultCfg as unknown as Record<string, unknown>)[entityConfigKey]);
      updateWidgetConfig(id, { ...defaultCfg, [entityConfigKey]: isList ? [entityId] : entityId } as WidgetConfig);
    }
    if (id) onAdded?.(id);
    onClose();
    if (id) setEditingWidgetId(id);
  };

  const count = (id: Category) => (id === 'all' ? WIDGET_META.length : WIDGET_META.filter(m => m.category === id).length);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key='add-modal-backdrop'
        data-overlay
        className='fixed inset-0 z-[60] bg-black/60'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Galerie : catégories, cartes, puis le widget choisi */}
      <motion.div
        key='add-modal'
        className='fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none'
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
      >
        <div
          role='dialog'
          aria-modal='true'
          aria-label={t('layout.addWidget')}
          className='pointer-events-auto grid w-full grid-cols-[minmax(0,1fr)_340px] gap-3 overflow-hidden rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] p-3 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)] lg:grid-cols-[230px_minmax(0,1fr)_380px]'
          style={{ maxWidth: 1280, height: 'min(820px, calc(100dvh - 32px))' }}
        >
          {/* ── Catégories ─────────────────────────────────────────── */}
          <nav
            aria-label={t('layout.addWidget')}
            className='hidden min-h-0 flex-col gap-1 overflow-y-auto rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-3 lg:flex'
          >
            <h2 className='px-3 pb-2 pt-2 text-lg font-semibold text-[var(--ds-ink-muted)]'>{t('layout.addWidget')}</h2>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                aria-current={category === cat.id}
                className={cn(
                  'flex h-14 items-center gap-3 rounded-[var(--ds-radius-lg)] px-3 text-left text-[17px]',
                  category === cat.id ? 'bg-[var(--ds-surface-3)] font-semibold' : 'font-medium text-[var(--ds-ink-muted)]'
                )}
              >
                <span className='flex size-10 shrink-0 items-center justify-center rounded-[13px]' style={{ background: cat.color }}>
                  <cat.icon size={20} className='text-white' />
                </span>
                <span className='flex-1 truncate'>{t(cat.label)}</span>
                <span className='text-sm tabular-nums text-[var(--ds-ink-muted)]'>{count(cat.id)}</span>
              </button>
            ))}
          </nav>

          {/* ── Recherche et cartes ────────────────────────────────── */}
          <section className='flex min-h-0 min-w-0 flex-col gap-3'>
            <div className='flex shrink-0 items-center gap-3'>
              <label className='flex h-14 flex-1 items-center gap-3 rounded-full bg-[var(--ds-surface-1)] px-5 text-[var(--ds-ink-muted)] focus-within:outline-2 focus-within:outline-[var(--ds-accent)]'>
                <Search size={20} className='shrink-0' />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('layout.searchWidget')}
                  aria-label={t('layout.searchWidget')}
                  className='min-w-0 flex-1 bg-transparent text-lg text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} aria-label={t('common.close')} className='text-[var(--ds-ink-muted)]'>
                    <X size={16} />
                  </button>
                )}
              </label>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                title={t('common.close')}
                className='flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-1)]'
              >
                <X size={20} />
              </button>
            </div>

            {/* Sous `lg`, la colonne des catégories disparaît : des pastilles la remplacent. */}
            <div className='flex shrink-0 flex-wrap gap-2 lg:hidden'>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  aria-pressed={category === cat.id}
                  className={cn(
                    'h-10 rounded-full px-4 text-sm font-semibold',
                    category === cat.id ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-1)] text-[var(--ds-ink-muted)]'
                  )}
                >
                  {t(cat.label)}
                </button>
              ))}
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
              {filtered.length === 0 ? (
                <div className='flex h-full flex-col items-center justify-center gap-2 text-[var(--ds-ink-muted)]'>
                  <Search size={28} />
                  <p className='text-base'>{t('layout.noResults')}</p>
                </div>
              ) : (
                <div className='grid grid-cols-2 gap-3 xl:grid-cols-3'>
                  {filtered.map(meta => (
                    <WidgetCard key={meta.type} meta={meta} selected={selected === meta.type} onClick={() => setSelected(meta.type)} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Le widget choisi ───────────────────────────────────── */}
          <div className='min-h-0 min-w-0 overflow-hidden rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)]'>
            <PreviewPanel meta={selectedMeta} onAdd={handleAdd} />
          </div>
        </div>
      </motion.div>
    </>
  );
}

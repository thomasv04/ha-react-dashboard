import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { cn } from '@/lib/utils';
import { WIDGET_META, CATEGORIES, type Category } from './widget-meta';
import { useI18n } from '@/i18n';
import { PreviewPanel } from './PreviewPanel';
import { ListRow } from './ListRow';

interface AddWidgetModalProps {
  onClose: () => void;
}

export function AddWidgetModal({ onClose }: AddWidgetModalProps) {
  const { t } = useI18n();
  const { addWidgetByType } = useDashboardLayout();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<GridWidget['type'] | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return WIDGET_META.filter(meta => {
      const matchCat = category === 'all' || meta.category === category;
      const matchSearch = !q || meta.label.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const selectedMeta = selected ? (WIDGET_META.find(m => m.type === selected) ?? null) : null;

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
                  <h2 className='text-white font-semibold text-base'>{t('layout.addWidget')}</h2>
                  <p className='text-white/22 text-[11px] mt-0.5'>{t('layout.addWidgetSub')}</p>
                </div>
                <button onClick={onClose} className='p-1.5 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/8 transition-colors'>
                  <X size={15} />
                </button>
              </div>
              <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 focus-within:border-white/20 transition-colors'>
                <Search size={13} className='text-white/28 shrink-0' />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('layout.searchWidget')}
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
                      : 'bg-white/4 text-white/30 border border-transparent hover:text-white/55 hover:bg-white/6'
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
                  <p className='text-white/18 text-xs'>{t('layout.noResults')}</p>
                </div>
              ) : (
                filtered.map(meta => (
                  <ListRow key={meta.type} meta={meta} selected={selected === meta.type} onClick={() => setSelected(meta.type)} />
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

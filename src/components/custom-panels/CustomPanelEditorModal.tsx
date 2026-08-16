import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { CustomPanel, CustomBlock } from '@/types/custom-panel';
import { genId, BLOCK_META, BLOCK_TYPE_PICKER, blockSummary } from './editor/block-meta';
import {
  ButtonBlockForm,
  ButtonRowBlockForm,
  CoverRowBlockForm,
  SectionHeaderBlockForm,
  WidgetBlockForm,
  PanelRefBadge,
} from './editor/BlockForms';

// ── Helpers ───────────────────────────────────────────────────────────────────

function BlockItem({
  block,
  index,
  total,
  expanded,
  onToggle,
  onUpdate,
  onMove,
  onDelete,
}: {
  block: CustomBlock;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (b: CustomBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const meta = BLOCK_META[block.type];
  const MetaIcon = meta.Icon;

  return (
    <div className='rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden'>
      <div
        className='flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-white/5 transition-colors'
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        role='button'
        tabIndex={0}
      >
        {/* Move buttons */}
        <div className='flex flex-col gap-0.5 flex-shrink-0' onClick={e => e.stopPropagation()}>
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={t('layout.customPanel.moveBlockUp')}
            className='p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors'
          >
            <ChevronUp size={12} />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={t('layout.customPanel.moveBlockDown')}
            className='p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors'
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Type badge */}
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0', meta.color)}>
          <MetaIcon size={11} />
          {t(meta.labelKey)}
        </span>

        {/* Summary */}
        <span className='flex-1 text-sm text-white/60 truncate min-w-0'>{blockSummary(block, t)}</span>

        {/* Delete */}
        <div className='flex items-center gap-1 flex-shrink-0' onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            aria-label={t('layout.customPanel.deleteBlock')}
            className='p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors'
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Expand chevron */}
        <div className='text-white/30 flex-shrink-0 transition-transform' style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={14} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className='overflow-hidden'
          >
            <div className='px-3 pb-3'>
              {block.type === 'button' && <ButtonBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'button-row' && <ButtonRowBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'cover-row' && <CoverRowBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'section-header' && <SectionHeaderBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'widget' && <WidgetBlockForm block={block} onChange={b => onUpdate(b)} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel editor (right pane) ─────────────────────────────────────────────────

function PanelEditor({ panel, onChange }: { panel: CustomPanel; onChange: (p: CustomPanel) => void }) {
  const { t } = useI18n();
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const updateBlock = (index: number, block: CustomBlock) => {
    const next = [...panel.blocks];
    next[index] = block;
    onChange({ ...panel, blocks: next });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const next = [...panel.blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...panel, blocks: next });
  };

  const deleteBlock = (index: number) => {
    const id = panel.blocks[index].id;
    if (expandedBlockId === id) setExpandedBlockId(null);
    onChange({ ...panel, blocks: panel.blocks.filter((_, i) => i !== index) });
  };

  const addBlock = (type: CustomBlock['type']) => {
    const id = genId();
    let block: CustomBlock;
    if (type === 'button') {
      block = { id, type: 'button', label: '', variant: 'primary', domain: '', service: '', targetEntityIds: [] };
    } else if (type === 'button-row') {
      block = { id, type: 'button-row', buttons: [] };
    } else if (type === 'cover-row') {
      block = { id, type: 'cover-row', entityId: '' };
    } else if (type === 'widget') {
      block = { id, type: 'widget', widgetType: '', config: {}, rows: 4 };
    } else {
      block = { id, type: 'section-header', title: '' };
    }
    onChange({ ...panel, blocks: [...panel.blocks, block] });
    setExpandedBlockId(id);
  };

  return (
    <div className='flex flex-col h-full overflow-hidden relative'>
      {/* Panel meta — compact single row */}
      <div className='flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0'>
        <input
          value={panel.name}
          onChange={e => onChange({ ...panel, name: e.target.value })}
          placeholder={t('layout.customPanel.panelPlaceholder')}
          className='flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 placeholder:text-white/30'
        />
        <div className='w-44 flex-shrink-0'>
          <IconPicker value={panel.icon ?? ''} onChange={v => onChange({ ...panel, icon: v || undefined })} label='' />
        </div>
      </div>

      {/* Ref badge */}
      <div className='px-4 py-2 border-b border-white/8 flex-shrink-0'>
        <PanelRefBadge panelId={panel.id} />
      </div>

      {/* Blocks header */}
      <div className='flex items-center justify-between px-4 py-2 border-b border-white/8 flex-shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-semibold text-white/40 uppercase tracking-wider'>{t('layout.customPanel.blocks')}</span>
          <span className='text-[11px] text-white/20'>({panel.blocks.length})</span>
        </div>
      </div>

      {/* Block list */}
      <div className='flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0'>
        {panel.blocks.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
            <div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center'>
              <Plus size={18} className='text-white/20' />
            </div>
            <p className='text-white/25 text-sm'>{t('layout.customPanel.noBlock')}</p>
            <p className='text-white/15 text-xs'>{t('layout.customPanel.noBlockHint')}</p>
          </div>
        )}
        {panel.blocks.map((block, i) => (
          <BlockItem
            key={block.id}
            block={block}
            index={i}
            total={panel.blocks.length}
            expanded={expandedBlockId === block.id}
            onToggle={() => setExpandedBlockId(prev => (prev === block.id ? null : block.id))}
            onUpdate={b => updateBlock(i, b)}
            onMove={dir => moveBlock(i, dir)}
            onDelete={() => deleteBlock(i)}
          />
        ))}
      </div>

      {/* Add block button */}
      <div className='px-4 py-3 border-t border-white/8 flex-shrink-0'>
        <button
          onClick={() => setShowPicker(v => !v)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors',
            showPicker
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70'
          )}
        >
          <Plus size={14} className={showPicker ? 'rotate-45 transition-transform' : 'transition-transform'} />
          {t('layout.customPanel.addBlock')}
        </button>
      </div>

      {/* Block type picker — floating above the button */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className='absolute inset-x-4 bottom-[60px] rounded-xl border border-white/12 shadow-2xl z-10 overflow-hidden'
            style={{ background: 'rgba(10, 14, 36, 0.98)', backdropFilter: 'blur(20px)' }}
          >
            <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/8'>
              <span className='text-[11px] font-semibold text-white/40 uppercase tracking-wider'>
                {t('layout.customPanel.chooseBlockType')}
              </span>
              <button
                onClick={() => setShowPicker(false)}
                aria-label={t('common.close')}
                className='p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors'
              >
                <X size={13} />
              </button>
            </div>
            <div className='p-3 grid grid-cols-3 gap-2'>
              {BLOCK_TYPE_PICKER.map(bt => (
                <button
                  key={bt.type}
                  onClick={() => {
                    addBlock(bt.type);
                    setShowPicker(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all',
                    'bg-transparent',
                    bt.border,
                    bt.hover
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bt.iconBg)}>
                    <bt.Icon size={17} className={bt.iconColor} />
                  </div>
                  <div>
                    <div className={cn('text-xs font-semibold leading-tight', bt.iconColor)}>{t(bt.labelKey)}</div>
                    <div className='text-[10px] text-white/30 mt-0.5 leading-tight'>{t(bt.descriptionKey)}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel list item ───────────────────────────────────────────────────────────

function PanelListItem({
  panel,
  active,
  onSelect,
  onDelete,
}: {
  panel: CustomPanel;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  // eslint-disable-next-line react-hooks/static-components
  const Icon = panel.icon ? resolveIcon(panel.icon) : null;

  return (
    <div
      onClick={onSelect}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      role='button'
      tabIndex={0}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
        active ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent'
      )}
    >
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', active ? 'bg-blue-500/20' : 'bg-white/8')}>
        {Icon ? (
          // eslint-disable-next-line react-hooks/static-components
          <Icon size={14} className={active ? 'text-blue-400' : 'text-white/50'} />
        ) : (
          <span className={cn('text-xs font-bold', active ? 'text-blue-400' : 'text-white/40')}>{panel.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <span className={cn('flex-1 text-sm font-medium truncate', active ? 'text-white' : 'text-white/60')}>{panel.name}</span>
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={t('layout.customPanel.deletePanel')}
        className='opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all'
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CustomPanelEditorModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { panels, upsertPanel, deletePanel } = useCustomPanels();

  // Local copy — synced to context on close
  const [localPanels, setLocalPanels] = useState<CustomPanel[]>(() => [...panels]);
  const [selectedId, setSelectedId] = useState<string | null>(panels[0]?.id ?? null);

  const selectedPanel = localPanels.find(p => p.id === selectedId) ?? null;

  const syncToContext = useCallback(
    (list: CustomPanel[]) => {
      // Upsert all local panels
      for (const p of list) upsertPanel(p);
      // Delete panels removed locally
      for (const p of panels) {
        if (!list.find(lp => lp.id === p.id)) deletePanel(p.id);
      }
    },
    [panels, upsertPanel, deletePanel]
  );

  const handleClose = () => {
    syncToContext(localPanels);
    onClose();
  };

  const createPanel = () => {
    const id = genId();
    const panel: CustomPanel = { id, name: t('layout.customPanel.newPanelDefault'), blocks: [] };
    const next = [...localPanels, panel];
    setLocalPanels(next);
    setSelectedId(id);
  };

  const handleDeleteLocal = (id: string) => {
    const next = localPanels.filter(p => p.id !== id);
    setLocalPanels(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const handlePanelChange = (panel: CustomPanel) => {
    setLocalPanels(prev => prev.map(p => (p.id === panel.id ? panel : p)));
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-[80] bg-black/60'
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: DURATION_FAST }}
        className='fixed inset-0 z-[81] flex items-center justify-center p-4 pointer-events-none'
      >
        <div
          className='pointer-events-auto w-full max-w-4xl h-[88vh] max-h-[920px] rounded-2xl border border-white/12 shadow-2xl flex flex-col overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.97)', backdropFilter: 'blur(20px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0'>
            <div className='w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center'>
              <Layers size={16} className='text-white' />
            </div>
            <div>
              <h2 className='text-white font-semibold text-base'>{t('layout.customPanel.title')}</h2>
              <p className='text-white/30 text-[11px]'>{t('layout.customPanel.subtitle')}</p>
            </div>
            <button
              onClick={handleClose}
              aria-label={t('common.close')}
              className='ml-auto p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors'
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className='flex flex-1 overflow-hidden min-h-0'>
            {/* Left sidebar — panel list */}
            <div className='w-52 border-r border-white/8 flex flex-col flex-shrink-0'>
              <div className='flex-1 overflow-y-auto p-3 space-y-1 min-h-0'>
                {localPanels.length === 0 && <p className='text-white/25 text-xs text-center py-6'>{t('layout.customPanel.noPanel')}</p>}
                {localPanels.map(panel => (
                  <PanelListItem
                    key={panel.id}
                    panel={panel}
                    active={selectedId === panel.id}
                    onSelect={() => setSelectedId(panel.id)}
                    onDelete={() => handleDeleteLocal(panel.id)}
                  />
                ))}
              </div>
              <div className='p-3 border-t border-white/8 flex-shrink-0'>
                <button
                  onClick={createPanel}
                  className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 text-xs font-medium transition-colors'
                >
                  <Plus size={13} />
                  {t('layout.customPanel.newPanel')}
                </button>
              </div>
            </div>

            {/* Right — editor */}
            <div className='flex-1 overflow-hidden min-w-0'>
              {selectedPanel ? (
                <PanelEditor panel={selectedPanel} onChange={handlePanelChange} />
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center gap-3 p-8'>
                  <div className='w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center'>
                    <Layers size={24} className='text-white/20' />
                  </div>
                  <div>
                    <p className='text-white/35 text-sm font-medium'>{t('layout.customPanel.selectPanel')}</p>
                    <p className='text-white/20 text-xs mt-1'>{t('layout.customPanel.selectPanelPromptSub')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between px-5 py-3 border-t border-white/8 flex-shrink-0'>
            <p className='text-[11px] text-white/25'>{t('layout.customPanel.footerNote')}</p>
            <button
              onClick={handleClose}
              className='px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium transition-colors'
            >
              {t('layout.customPanel.close')}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

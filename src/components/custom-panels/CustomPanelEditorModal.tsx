import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { X, Plus, Trash2, Copy, ChevronUp, ChevronDown, Layers, Loader2, PanelRight } from 'lucide-react';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePages } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { CustomPanelBlocks } from './CustomPanelRenderer';
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
  onDuplicate,
  onDelete,
}: {
  block: CustomBlock;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (b: CustomBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const meta = BLOCK_META[block.type];
  const MetaIcon = meta.Icon;

  return (
    <div className='rounded-[var(--ds-radius-md)] border border-[var(--ds-surface-3)] bg-[var(--ds-surface-2)] overflow-hidden'>
      <div
        className='flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors'
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
            className='p-0.5 text-[var(--ds-ink-muted)] disabled:opacity-20 transition-colors'
          >
            <ChevronUp size={12} />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={t('layout.customPanel.moveBlockDown')}
            className='p-0.5 text-[var(--ds-ink-muted)] disabled:opacity-20 transition-colors'
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
        <span className='flex-1 text-sm text-[var(--ds-ink-muted)] truncate min-w-0'>{blockSummary(block, t)}</span>

        {/* Delete */}
        <div className='flex items-center gap-1 flex-shrink-0' onClick={e => e.stopPropagation()}>
          <button
            onClick={onDuplicate}
            aria-label={t('layout.customPanel.duplicateBlock')}
            title={t('layout.customPanel.duplicateBlock')}
            className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
          >
            <Copy size={13} />
          </button>
          <button
            onClick={onDelete}
            aria-label={t('layout.customPanel.deleteBlock')}
            className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)] transition-colors'
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Expand chevron */}
        <div
          className='text-[var(--ds-ink-muted)] flex-shrink-0 transition-transform'
          style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
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
  const [showHeaderButtons, setShowHeaderButtons] = useState(false);
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

  const duplicateBlock = (index: number) => {
    // `genId()` sur la copie, et sur ses boutons : deux blocs de même
    // identifiant, c'est une clé React en double et un éditeur qui modifie les
    // deux à la fois.
    const source = panel.blocks[index];
    const copy = structuredClone(source);
    copy.id = genId();
    if (copy.type === 'button-row') copy.buttons = copy.buttons.map(b => ({ ...b, id: genId() }));
    const next = [...panel.blocks];
    next.splice(index + 1, 0, copy);
    onChange({ ...panel, blocks: next });
    setExpandedBlockId(copy.id);
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
      <div className='flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
        <input
          value={panel.name}
          onChange={e => onChange({ ...panel, name: e.target.value })}
          placeholder={t('layout.customPanel.panelPlaceholder')}
          className='flex-1 px-3 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]'
        />
        <div className='w-44 flex-shrink-0'>
          <IconPicker value={panel.icon ?? ''} onChange={v => onChange({ ...panel, icon: v || undefined })} label='' />
        </div>
        <label className='flex items-center gap-2 flex-shrink-0 cursor-pointer' title={t('layout.customPanel.twoColumnsDesc')}>
          <input
            type='checkbox'
            checked={panel.columns === 2}
            onChange={e => onChange({ ...panel, columns: e.target.checked ? 2 : undefined })}
            className='w-4 h-4 accent-[var(--ds-accent)]'
          />
          <span className='text-xs text-[var(--ds-ink-muted)]'>{t('layout.customPanel.twoColumns')}</span>
        </label>
      </div>

      {/* Boutons d'en-tête — repliés : la plupart des panneaux n'en ont pas. */}
      <div className='px-4 py-2 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
        <button
          onClick={() => setShowHeaderButtons(v => !v)}
          className='w-full flex items-center justify-between text-[11px] font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider transition-colors'
        >
          <span>
            {t('layout.customPanel.headerButtons')}
            <span className='ml-2 normal-case tracking-normal text-[var(--ds-ink-muted)]'>({panel.headerButtons?.length ?? 0})</span>
          </span>
          {showHeaderButtons ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {showHeaderButtons && (
          <>
            <p className='text-[var(--ds-ink-muted)] text-[11px] mt-1'>{t('layout.customPanel.headerButtonsDesc')}</p>
            {/* Même éditeur que la rangée de boutons : c'est la même liste, à
                l'endroit où elle s'affiche près. */}
            <ButtonRowBlockForm
              block={{ id: `${panel.id}-header`, type: 'button-row', buttons: panel.headerButtons ?? [] }}
              onChange={b => onChange({ ...panel, headerButtons: b.buttons.length ? b.buttons : undefined })}
            />
          </>
        )}
      </div>

      {/* Ref badge */}
      <div className='px-4 py-2 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
        <PanelRefBadge panelId={panel.id} />
      </div>

      {/* Blocks header */}
      <div className='flex items-center justify-between px-4 py-2 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider'>
            {t('layout.customPanel.blocks')}
          </span>
          <span className='text-[11px] text-[var(--ds-ink-muted)]'>({panel.blocks.length})</span>
        </div>
      </div>

      {/* Block list */}
      <div className='flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0'>
        {panel.blocks.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
            <div className='w-10 h-10 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] flex items-center justify-center'>
              <Plus size={18} className='text-[var(--ds-ink-muted)]' />
            </div>
            <p className='text-[var(--ds-ink-muted)] text-sm'>{t('layout.customPanel.noBlock')}</p>
            <p className='text-[var(--ds-ink-muted)] text-xs'>{t('layout.customPanel.noBlockHint')}</p>
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
            onDuplicate={() => duplicateBlock(i)}
            onDelete={() => deleteBlock(i)}
          />
        ))}
      </div>

      {/* Add block button */}
      <div className='px-4 py-3 border-t border-[var(--ds-surface-3)] flex-shrink-0'>
        <button
          onClick={() => setShowPicker(v => !v)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-[var(--ds-radius-md)] border text-sm font-medium transition-colors',
            showPicker
              ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
              : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
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
            className='absolute inset-x-4 bottom-[60px] rounded-[var(--ds-radius-md)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] z-10 overflow-hidden'
            style={{ background: 'var(--ds-surface-1)' }}
          >
            <div className='flex items-center justify-between px-4 py-2.5 border-b border-[var(--ds-surface-3)]'>
              <span className='text-[11px] font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider'>
                {t('layout.customPanel.chooseBlockType')}
              </span>
              <button
                onClick={() => setShowPicker(false)}
                aria-label={t('common.close')}
                className='p-1 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
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
                    'flex flex-col items-center gap-2 p-3 rounded-[var(--ds-radius-md)] border text-center transition-all',
                    'bg-transparent',
                    bt.border,
                    bt.hover
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-[var(--ds-radius-md)] flex items-center justify-center', bt.iconBg)}>
                    <bt.Icon size={17} className={bt.iconColor} />
                  </div>
                  <div>
                    <div className={cn('text-xs font-semibold leading-tight', bt.iconColor)}>{t(bt.labelKey)}</div>
                    <div className='text-[10px] text-[var(--ds-ink-muted)] mt-0.5 leading-tight'>{t(bt.descriptionKey)}</div>
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

// ── Aperçu ────────────────────────────────────────────────────────────────────

/**
 * Le panneau tel qu'il s'affichera, à côté de son formulaire.
 *
 * Rendu depuis le brouillon et non depuis le contexte : c'est tout l'intérêt,
 * voir l'effet d'un bloc avant de l'enregistrer.
 *
 * Inerte : les blocs appellent de vrais services Home Assistant, et un aperçu
 * qui ferme le volet du salon quand on le regarde n'est pas un aperçu. Le
 * `pointer-events-none` porte sur le contenu, pas sur le conteneur, pour que le
 * défilement continue de fonctionner.
 */
function PanelPreview({ panel }: { panel: CustomPanel }) {
  const { t } = useI18n();

  const Icon = panel.icon ? resolveIcon(panel.icon) : null;

  return (
    <div
      className='w-[440px] shrink-0 border-l border-[var(--ds-surface-3)] flex flex-col min-h-0'
      style={{ background: 'rgba(0, 0, 0, 0.18)' }}
    >
      <div className='flex items-center gap-2 px-4 py-2.5 border-b border-[var(--ds-surface-3)] shrink-0'>
        <span className='text-[11px] font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider'>{t('layout.preview')}</span>
      </div>

      <div className='flex-1 overflow-y-auto p-4 min-h-0'>
        <div className='rounded-[var(--ds-radius-lg)] border border-[var(--ds-surface-3)] bg-[var(--ds-surface-2)] overflow-hidden'>
          <div className='flex items-center gap-2.5 px-4 py-3 border-b border-[var(--ds-surface-3)] text-[var(--ds-ink)]'>
            {Icon ? (
              // eslint-disable-next-line react-hooks/static-components
              <Icon size={16} className='text-[var(--ds-ink)]' />
            ) : null}
            <h3 className='text-sm font-semibold truncate'>{panel.name}</h3>
          </div>
          <div className='p-3 pointer-events-none'>
            <CustomPanelBlocks panel={panel} />
          </div>
        </div>
      </div>
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

  const Icon = panel.icon ? resolveIcon(panel.icon) : null;

  return (
    <div
      onClick={onSelect}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      role='button'
      tabIndex={0}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--ds-radius-md)] cursor-pointer transition-all',
        active ? 'bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)]' : 'border border-transparent'
      )}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-[var(--ds-radius-sm)] flex items-center justify-center flex-shrink-0',
          active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
        )}
      >
        {Icon ? (
          // eslint-disable-next-line react-hooks/static-components
          <Icon size={14} className={active ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]'} />
        ) : (
          <span className={cn('text-xs font-bold', active ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}>
            {panel.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className={cn('flex-1 text-sm font-medium truncate', active ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]')}>
        {panel.name}
      </span>
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={t('layout.customPanel.deletePanel')}
        className='opacity-0 group-hover:opacity-100 p-1 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)] transition-all'
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CustomPanelEditorModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { panels, upsertPanel, deletePanel, dock } = useCustomPanels();
  const { pages } = usePages();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { config: wpConfig, wallPanelLayout, wallPanelWidgetConfigs } = useWallPanel();
  const { saveConfig, isSaving } = useDashboardConfig();

  // Local copy — synced to context on close
  const [localPanels, setLocalPanels] = useState<CustomPanel[]>(() => [...panels]);
  const [selectedId, setSelectedId] = useState<string | null>(panels[0]?.id ?? null);
  // Instantané d'ouverture, initialiseur paresseux : il sert à savoir si le
  // brouillon a bougé, donc il est lu au rendu — ce qu'un ref n'a pas le droit
  // d'être.
  const [initial] = useState(() => JSON.stringify(panels));
  const [confirmClose, setConfirmClose] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const dirty = JSON.stringify(localPanels) !== initial;

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

  // Les panneaux ne vivaient que dans le contexte : ils n'atteignaient le
  // serveur que par le bouton Sauvegarder du dashboard, absent hors édition —
  // et l'éditeur s'ouvre aussi hors édition. Un panneau composé là était perdu
  // au rechargement. Il s'enregistre maintenant depuis ici.
  const handleClose = async () => {
    syncToContext(localPanels);
    const saved = await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: { config: wpConfig, layout: wallPanelLayout, widgetConfigs: wallPanelWidgetConfigs },
      // La liste locale, pas celle du contexte : `syncToContext` passe par des
      // `setState` qui n'ont pas encore été rendus.
      customPanels: localPanels,
      dock,
    });
    if (saved) onClose();
  };

  /** Fermeture : un brouillon modifié ne sort pas d'ici sans un choix explicite. */
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

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
        data-overlay
        className='fixed inset-0 z-[80] bg-black/60'
        onClick={requestClose}
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
          className='pointer-events-auto w-full h-[88vh] max-h-[920px] rounded-[var(--ds-radius-lg)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] flex flex-col overflow-hidden transition-[max-width] duration-300'
          // La fenêtre s'élargit pour loger l'aperçu plutôt que de rogner le
          // formulaire. Largeur en style et non en classe : `max-w-7xl` ne
          // figurait pas dans la feuille générée et se résolvait en `none` — la
          // fenêtre prenait toute la place disponible.
          style={{ background: 'var(--ds-surface-1)', maxWidth: showPreview ? 1400 : 896 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center gap-3 px-5 py-4 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
            <div className='w-8 h-8 rounded-[var(--ds-radius-md)] bg-gradient-to-br from-[var(--ds-app-music)] to-[var(--ds-app-music)] flex items-center justify-center'>
              <Layers size={16} className='text-[var(--ds-ink)]' />
            </div>
            <div>
              <h2 className='text-[var(--ds-ink)] font-semibold text-base'>{t('layout.customPanel.title')}</h2>
              <p className='text-[var(--ds-ink-muted)] text-[11px]'>{t('layout.customPanel.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowPreview(v => !v)}
              aria-label={t('layout.preview')}
              aria-pressed={showPreview}
              title={t('layout.preview')}
              className={cn(
                'ml-auto p-1.5 rounded-[var(--ds-radius-sm)] border transition-colors',
                showPreview
                  ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                  : 'border-transparent text-[var(--ds-ink-muted)]'
              )}
            >
              <PanelRight size={16} />
            </button>
            <button
              onClick={requestClose}
              aria-label={t('common.close')}
              className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className='flex flex-1 overflow-hidden min-h-0'>
            {/* Left sidebar — panel list */}
            <div className='w-52 border-r border-[var(--ds-surface-3)] flex flex-col flex-shrink-0'>
              <div className='flex-1 overflow-y-auto p-3 space-y-1 min-h-0'>
                {localPanels.length === 0 && (
                  <p className='text-[var(--ds-ink-muted)] text-xs text-center py-6'>{t('layout.customPanel.noPanel')}</p>
                )}
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
              <div className='p-3 border-t border-[var(--ds-surface-3)] flex-shrink-0'>
                <button
                  onClick={createPanel}
                  className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)] text-xs font-medium transition-colors'
                >
                  <Plus size={13} />
                  {t('layout.customPanel.newPanel')}
                </button>
              </div>
            </div>

            {/* Middle — editor */}
            <div className='flex-1 overflow-hidden min-w-0'>
              {selectedPanel ? (
                <PanelEditor panel={selectedPanel} onChange={handlePanelChange} />
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center gap-3 p-8'>
                  <div className='w-14 h-14 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] flex items-center justify-center'>
                    <Layers size={24} className='text-[var(--ds-ink-muted)]' />
                  </div>
                  <div>
                    <p className='text-[var(--ds-ink-muted)] text-sm font-medium'>{t('layout.customPanel.selectPanel')}</p>
                    <p className='text-[var(--ds-ink-muted)] text-xs mt-1'>{t('layout.customPanel.selectPanelPromptSub')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — aperçu, replié par défaut */}
            {showPreview && selectedPanel && <PanelPreview panel={selectedPanel} />}
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between px-5 py-3 border-t border-[var(--ds-surface-3)] flex-shrink-0'>
            {confirmClose ? (
              <p className='text-[var(--ds-warm-light)] text-xs'>{t('layout.customPanel.unsavedWarning')}</p>
            ) : (
              <p className={cn('text-[11px]', dirty ? 'text-[var(--ds-warm-light)]' : 'text-[var(--ds-ink-muted)]')}>
                {dirty ? t('layout.customPanel.unsavedChanges') : t('layout.customPanel.footerNote')}
              </p>
            )}
            <div className='flex items-center gap-2 shrink-0'>
              {confirmClose && (
                <button
                  onClick={onClose}
                  className='px-3 py-2 rounded-[var(--ds-radius-md)] text-sm font-medium text-[var(--ds-ink-muted)] transition-colors'
                >
                  {t('layout.customPanel.discard')}
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving}
                className='flex items-center gap-2 px-4 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)] text-sm font-medium transition-colors disabled:opacity-50'
              >
                {isSaving && <Loader2 size={14} className='animate-spin' />}
                {t('layout.customPanel.saveAndClose')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

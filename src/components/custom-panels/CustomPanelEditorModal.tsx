import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { topSheet } from '@/lib/motion-variants';
import { X, Plus, Trash2, Copy, ChevronUp, ChevronDown, Loader2, LayoutGrid } from 'lucide-react';
import { useCustomPanels, type DockConfig } from '@/context/CustomPanelContext';
import { usePages } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { SwitchTrack } from '@/components/ds/Switch';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { CustomPanelBlocks } from './CustomPanelRenderer';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { CustomPanel, CustomBlock } from '@/types/custom-panel';
import { genId, BLOCK_TYPES, blockType, blockSummary } from './editor/block-meta';
import {
  ButtonBlockForm,
  ButtonRowBlockForm,
  CoverRowBlockForm,
  SectionHeaderBlockForm,
  WidgetBlockForm,
  PanelRefBadge,
} from './editor/BlockForms';

/** Section Echo : fond `surface-1`, coins de 30 px. */
const SECTION = 'rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-[22px]';
/** Ligne Echo : fond `surface-2`, coins de 22 px, assez haute pour le doigt. */
const ROW = 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)]';
const ROUND = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] disabled:opacity-30';

/** Pastille d'icône carrée, comme les apps du lanceur. */
function AppIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className='flex size-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white'
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

// ── Un bloc de la modale ─────────────────────────────────────────────────────

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
  const meta = blockType(block.type);

  return (
    <div className={cn(ROW, 'overflow-hidden')}>
      <div className='flex min-h-[68px] items-center gap-3 px-3 py-2'>
        <div className='flex shrink-0 flex-col gap-1'>
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={t('layout.customPanel.moveBlockUp')}
            className='flex size-7 items-center justify-center rounded-full bg-[var(--ds-surface-3)] disabled:opacity-30'
          >
            <ChevronUp size={14} />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={t('layout.customPanel.moveBlockDown')}
            className='flex size-7 items-center justify-center rounded-full bg-[var(--ds-surface-3)] disabled:opacity-30'
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <AppIcon color={meta.color}>
          <meta.Icon size={20} />
        </AppIcon>

        <button onClick={onToggle} aria-expanded={expanded} className='flex min-w-0 flex-1 items-center gap-3 self-stretch text-left'>
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-[17px] font-semibold'>{t(meta.labelKey)}</span>
            <span className='block truncate text-sm text-[var(--ds-ink-muted)]'>{blockSummary(block, t)}</span>
          </span>
          <ChevronDown size={18} className={cn('shrink-0 transition-transform', expanded && 'rotate-180')} />
        </button>

        <button
          onClick={onDuplicate}
          aria-label={t('layout.customPanel.duplicateBlock')}
          title={t('layout.customPanel.duplicateBlock')}
          className={ROUND}
        >
          <Copy size={16} />
        </button>
        <button onClick={onDelete} aria-label={t('layout.customPanel.deleteBlock')} className={cn(ROUND, 'text-[var(--ds-alert)]')}>
          <Trash2 size={16} />
        </button>
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
            <div className='px-4 pb-4'>
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

// ── La modale choisie ────────────────────────────────────────────────────────

function PanelEditor({
  panel,
  pinned,
  onChange,
  onTogglePin,
  onDelete,
}: {
  panel: CustomPanel;
  pinned: boolean;
  onChange: (p: CustomPanel) => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
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
    setShowPicker(false);
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <input
          value={panel.name}
          onChange={e => onChange({ ...panel, name: e.target.value })}
          placeholder={t('layout.customPanel.panelPlaceholder')}
          aria-label={t('layout.customPanel.panelPlaceholder')}
          className={cn(
            ROW,
            'h-12 min-w-[240px] flex-1 px-4 text-xl font-semibold text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)] focus:ring-2 focus:ring-[var(--ds-accent)]'
          )}
        />
        <div className='w-48 shrink-0'>
          <IconPicker value={panel.icon ?? ''} onChange={v => onChange({ ...panel, icon: v || undefined })} label='' />
        </div>
      </div>

      <button
        role='switch'
        aria-checked={pinned}
        onClick={onTogglePin}
        className={cn(ROW, 'flex min-h-[68px] items-center gap-4 px-4 text-left')}
      >
        <span className='min-w-0 flex-1'>
          <span className='block text-[17px] font-semibold'>{t('layout.customPanel.showInRail')}</span>
          <span className='block text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.showInRailDesc')}</span>
        </span>
        <SwitchTrack on={pinned} />
      </button>

      {pinned && (
        <div className={cn(ROW, 'flex flex-col gap-2 p-4')}>
          <EntityPicker
            value={panel.railEntity ?? ''}
            onChange={v => onChange({ ...panel, railEntity: v || undefined })}
            label={t('layout.customPanel.railEntity')}
          />
          <span className='text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.railEntityDesc')}</span>
        </div>
      )}

      {/* Boutons d'en-tête — repliés : la plupart des modales n'en ont pas. */}
      <div className={cn(ROW, 'px-4')}>
        <button onClick={() => setShowHeaderButtons(v => !v)} className='flex min-h-[60px] w-full items-center justify-between text-left'>
          <span className='text-[17px] font-semibold'>
            {t('layout.customPanel.headerButtons')}
            <span className='ml-2 text-sm font-normal text-[var(--ds-ink-muted)]'>{panel.headerButtons?.length ?? 0}</span>
          </span>
          {showHeaderButtons ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showHeaderButtons && (
          <div className='pb-4'>
            <p className='mb-2 text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.headerButtonsDesc')}</p>
            {/* Même éditeur que la rangée de boutons : c'est la même liste, à
                l'endroit où elle s'affiche près. */}
            <ButtonRowBlockForm
              block={{ id: `${panel.id}-header`, type: 'button-row', buttons: panel.headerButtons ?? [] }}
              onChange={b => onChange({ ...panel, headerButtons: b.buttons.length ? b.buttons : undefined })}
            />
          </div>
        )}
      </div>

      <PanelRefBadge panelId={panel.id} />

      <h3 className='mt-3 px-1.5 text-xl font-semibold'>
        {t('layout.customPanel.blocks')}
        <span className='ml-2 text-base font-normal text-[var(--ds-ink-muted)]'>{panel.blocks.length}</span>
      </h3>

      {panel.blocks.length === 0 && !showPicker && (
        <p className='px-1.5 text-[var(--ds-ink-muted)]'>{t('layout.customPanel.noBlockHint')}</p>
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

      {showPicker ? (
        <div className={cn(ROW, 'p-3')}>
          <div className='mb-2 flex items-center justify-between px-1.5'>
            <span className='text-[17px] font-semibold'>{t('layout.customPanel.chooseBlockType')}</span>
            <button onClick={() => setShowPicker(false)} aria-label={t('common.close')} className={ROUND}>
              <X size={16} />
            </button>
          </div>
          <div className='grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2'>
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className='flex items-center gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] p-3 text-left'
              >
                <AppIcon color={bt.color}>
                  <bt.Icon size={20} />
                </AppIcon>
                <span className='min-w-0'>
                  <span className='block text-[17px] font-semibold'>{t(bt.labelKey)}</span>
                  <span className='line-clamp-2 text-[13px] text-[var(--ds-ink-muted)]'>{t(bt.descriptionKey)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className='flex min-h-[64px] items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border-2 border-dashed border-[var(--ds-surface-3)] text-[17px] font-semibold text-[var(--ds-ink-muted)]'
        >
          <Plus size={20} />
          {t('layout.customPanel.addBlock')}
        </button>
      )}

      {/* Toujours visible : une corbeille qui n'apparaît qu'au survol n'existe pas au doigt. */}
      <button
        onClick={onDelete}
        className='mt-4 flex h-12 items-center justify-center gap-2 self-start rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] px-5 font-semibold text-[var(--ds-alert)]'
      >
        <Trash2 size={18} />
        {t('layout.customPanel.deletePanel')}
      </button>
    </div>
  );
}

// ── L'éditeur ────────────────────────────────────────────────────────────────

/**
 * Éditeur des modales, façon Echo : une feuille plein écran avec la liste des
 * modales, la modale choisie et — sur un écran assez large — son aperçu en
 * direct. Tout s'enregistre d'un coup, modales et menu de gauche.
 */
export function CustomPanelEditorModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { panels, upsertPanel, deletePanel, dock, setDock } = useCustomPanels();
  const { pages } = usePages();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { config: wpConfig, wallPanelLayout, wallPanelWidgetConfigs } = useWallPanel();
  const { saveConfig, isSaving } = useDashboardConfig();

  // Brouillons, recopiés dans le contexte à l'enregistrement.
  const [localPanels, setLocalPanels] = useState<CustomPanel[]>(() => [...panels]);
  const [localDock, setLocalDock] = useState<DockConfig>(dock);
  const [selectedId, setSelectedId] = useState<string | null>(panels[0]?.id ?? null);
  // Instantané d'ouverture, initialiseur paresseux : il sert à savoir si le
  // brouillon a bougé, donc il est lu au rendu — ce qu'un ref n'a pas le droit
  // d'être.
  const [initial] = useState(() => JSON.stringify([panels, dock]));
  const [confirmClose, setConfirmClose] = useState(false);

  const dirty = JSON.stringify([localPanels, localDock]) !== initial;

  const selectedPanel = localPanels.find(p => p.id === selectedId) ?? null;

  const syncToContext = useCallback(
    (list: CustomPanel[]) => {
      for (const p of list) upsertPanel(p);
      for (const p of panels) {
        if (!list.find(lp => lp.id === p.id)) deletePanel(p.id);
      }
    },
    [panels, upsertPanel, deletePanel]
  );

  // Les modales ne vivaient que dans le contexte : elles n'atteignaient le
  // serveur que par le bouton Sauvegarder du dashboard, absent hors édition —
  // et l'éditeur s'ouvre aussi hors édition. Une modale composée là était
  // perdue au rechargement. Elle s'enregistre maintenant depuis ici.
  const handleSave = async () => {
    // Une modale supprimée quitte aussi le menu de gauche.
    const nextDock = { ...localDock, panels: localDock.panels.filter(id => localPanels.some(p => p.id === id)) };
    syncToContext(localPanels);
    setDock(nextDock);
    const saved = await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: { config: wpConfig, layout: wallPanelLayout, widgetConfigs: wallPanelWidgetConfigs },
      // Les brouillons, pas le contexte : `syncToContext` et `setDock` passent
      // par des `setState` qui n'ont pas encore été rendus.
      customPanels: localPanels,
      dock: nextDock,
    });
    if (saved) onClose();
  };

  /** Fermeture : un brouillon modifié ne sort pas d'ici sans un choix explicite. */
  const requestClose = useCallback(() => (dirty ? setConfirmClose(true) : onClose()), [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const createPanel = () => {
    const id = genId();
    setLocalPanels(prev => [...prev, { id, name: t('layout.customPanel.newPanelDefault'), blocks: [] }]);
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

  const togglePin = (id: string) =>
    setLocalDock(prev => ({ ...prev, panels: prev.panels.includes(id) ? prev.panels.filter(p => p !== id) : [...prev.panels, id] }));

  return (
    <motion.div
      role='dialog'
      aria-modal='true'
      aria-label={t('layout.customPanel.title')}
      data-overlay
      variants={topSheet}
      initial='hidden'
      animate='visible'
      exit='exit'
      className='fixed inset-0 z-[81] flex flex-col bg-[var(--ds-ground)] text-[var(--ds-ink)]'
    >
      <header className='relative shrink-0'>
        <div aria-hidden='true' className='mx-auto mt-4 h-[5px] w-20 rounded-full bg-[var(--ds-ink-muted)]' />
        <h2 className='px-20 pt-5 text-center text-2xl font-semibold'>{t('layout.customPanel.title')}</h2>
        <div className='absolute right-6 top-6 flex items-center gap-3'>
          {confirmClose ? (
            <>
              <span className='hidden text-sm text-[var(--ds-warm-light)] md:inline'>{t('layout.customPanel.unsavedWarning')}</span>
              <button onClick={onClose} className='h-11 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-5 font-semibold'>
                {t('layout.customPanel.discard')}
              </button>
            </>
          ) : (
            dirty && <span className='hidden text-sm text-[var(--ds-warm-light)] md:inline'>{t('layout.customPanel.unsavedChanges')}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className='flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-tile-on)] px-5 font-semibold text-[var(--ds-tile-on-ink)] disabled:opacity-50'
          >
            {isSaving && <Loader2 size={16} className='animate-spin' />}
            {t('layout.customPanel.saveAndClose')}
          </button>
          <button
            onClick={requestClose}
            aria-label={t('common.close')}
            className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Écran étroit : les sections s'empilent et la feuille défile. */}
      <div className='flex min-h-0 flex-1 gap-[22px] px-4 pb-8 pt-6 max-md:flex-col max-md:overflow-y-auto sm:px-10'>
        <section className={cn(SECTION, 'flex shrink-0 flex-col gap-1 md:w-[260px] md:overflow-y-auto')}>
          <h3 className='mb-2 px-1.5 text-xl font-semibold'>{t('layout.customPanel.listTitle')}</h3>
          {localPanels.length === 0 && <p className='px-1.5 py-2 text-[var(--ds-ink-muted)]'>{t('layout.customPanel.noPanel')}</p>}
          {localPanels.map(panel => {
            const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
            const active = panel.id === selectedId;
            return (
              <button
                key={panel.id}
                onClick={() => setSelectedId(panel.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex min-h-[62px] items-center gap-4 rounded-2xl px-2 text-left text-[17px] font-semibold',
                  active && 'bg-[var(--ds-surface-3)]'
                )}
              >
                <AppIcon color='var(--ds-app-music)'>
                  <Icon size={22} />
                </AppIcon>
                <span className='truncate'>{panel.name}</span>
              </button>
            );
          })}
          <button
            onClick={createPanel}
            className='mt-2 flex min-h-[62px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--ds-surface-3)] font-semibold text-[var(--ds-ink-muted)]'
          >
            <Plus size={20} />
            {t('layout.customPanel.newPanel')}
          </button>
        </section>

        <section className={cn(SECTION, 'min-w-0 flex-1 md:overflow-y-auto')}>
          {selectedPanel ? (
            <PanelEditor
              panel={selectedPanel}
              pinned={localDock.panels.includes(selectedPanel.id)}
              onChange={handlePanelChange}
              onTogglePin={() => togglePin(selectedPanel.id)}
              onDelete={() => handleDeleteLocal(selectedPanel.id)}
            />
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
              <p className='text-xl font-semibold'>{t('layout.customPanel.selectPanel')}</p>
              <button
                onClick={createPanel}
                className='flex h-12 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-tile-on)] px-6 font-semibold text-[var(--ds-tile-on-ink)]'
              >
                <Plus size={20} />
                {t('layout.customPanel.newPanel')}
              </button>
            </div>
          )}
        </section>

        {/* Aperçu inerte : les blocs appellent de vrais services, et un aperçu
            qui ferme le volet du salon quand on le regarde n'en est pas un. */}
        {selectedPanel && (
          <section className={cn(SECTION, 'w-[340px] shrink-0 overflow-y-auto max-xl:hidden')}>
            <h3 className='mb-3 px-1.5 text-xl font-semibold'>{t('layout.preview')}</h3>
            <div className='pointer-events-none'>
              <CustomPanelBlocks panel={selectedPanel} />
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

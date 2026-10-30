import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { PencilLine, Check, X, Plus, Loader2, HelpCircle, Undo2, Redo2, Trash2, ChevronLeft } from 'lucide-react';
import { useUser } from '@hakit/core';
import { useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { usePages } from '@/context/PageContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { HelpModal } from '@/components/onboarding/HelpModal';
import { useI18n } from '@/i18n';
import { useGridSelection } from '@/components/layout/DashboardGrid';
import { useTheme } from '@/context/ThemeContext';
import { EDIT_PANEL_EVENT } from '@/lib/panel-grid';
import { cn } from '@/lib/utils';

export function EditButton() {
  const { t } = useI18n();
  const user = useUser();
  const { isEditMode, setEditMode, editPanelId, setEditPanelId } = useEditMode();
  const { saveLayout, allLayouts, undo, redo, canUndo, canRedo, removeWidgets, addPanel } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { pages } = usePages();
  const { config: wpConfig, wallPanelLayout, wallPanelWidgetConfigs } = useWallPanel();
  const { panels: customPanels, dock } = useCustomPanels();
  const selection = useGridSelection();

  const { saveConfig, isSaving } = useDashboardConfig();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { behaviourSettings } = useTheme();
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinWrong, setPinWrong] = useState(false);
  // ✕ : un premier appui demande confirmation, un second abandonne.
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Les configurations de widgets ne passent pas par la pile « annuler » : on
  // repère leurs changements en comparant à ce qu'elles étaient en entrant.
  const entryConfigs = useRef(allWidgetConfigsByPage);
  useEffect(() => {
    if (isEditMode) entryConfigs.current = allWidgetConfigsByPage;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relevé à l'entrée seulement
  }, [isEditMode]);

  useEffect(() => {
    if (!confirmingDiscard) return;
    const id = setTimeout(() => setConfirmingDiscard(false), 4000);
    return () => clearTimeout(id);
  }, [confirmingDiscard]);

  const isAdmin = !!user?.is_admin;

  /**
   * Entrée en édition, éventuellement derrière un code.
   *
   * Le code est un **garde-fou**, pas une sécurité : il vit côté client, qui
   * peut le lire. Il empêche le geste involontaire sur une tablette murale —
   * la vraie protection des écritures est côté serveur (`adminWrites`).
   */
  const enterEditMode = useCallback(() => {
    if (!behaviourSettings.editPin) return setEditMode(true);
    setPinEntry('');
    setPinWrong(false);
    setPinPrompt(true);
  }, [behaviourSettings.editPin, setEditMode]);

  // ✎ ou ⚙ sur un panneau : on n'édite que lui, derrière le même code d'accès.
  useEffect(() => {
    const onEditPanel = (e: Event) => {
      if (!isAdmin) return;
      setEditPanelId((e as CustomEvent<string>).detail);
      if (!isEditMode) enterEditMode();
    };
    window.addEventListener(EDIT_PANEL_EVENT, onEditPanel);
    return () => window.removeEventListener(EDIT_PANEL_EVENT, onEditPanel);
  }, [isAdmin, isEditMode, enterEditMode, setEditPanelId]);

  if (!isAdmin) return null;

  const submitPin = () => {
    if (pinEntry !== behaviourSettings.editPin) return setPinWrong(true);
    setPinPrompt(false);
    setEditMode(true);
  };

  const handleSave = async () => {
    saveLayout();
    const saved = await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: {
        config: wpConfig,
        layout: wallPanelLayout,
        widgetConfigs: wallPanelWidgetConfigs,
      },
      customPanels,
      dock,
    });
    // Sur un refus, on reste en édition : le toast prévient, rien n'est perdu.
    if (saved) setEditMode(false);
  };

  /**
   * Abandonne l'édition. Sans modification, on sort simplement ; sinon un
   * second appui — que la page rechargée tient pour définitif : la dernière
   * version enregistrée revient, jusque dans les configurations de widgets.
   */
  const handleDiscard = () => {
    const dirty = canUndo || allWidgetConfigsByPage !== entryConfigs.current;
    if (!dirty) return setEditMode(false);
    if (!confirmingDiscard) return setConfirmingDiscard(true);
    window.location.reload();
  };

  return (
    <>
      {/* À droite du bouton du lanceur, dans la barre du haut. `flex-wrap` :
          sur une fenêtre étroite les actions d'édition repassent à la ligne au
          lieu de recouvrir l'heure. Le conteneur laisse passer les clics, seuls
          les boutons les captent. */}
      <div className='fixed top-[30px] left-[96px] sm:left-[116px] right-4 z-50 flex flex-wrap items-center gap-2 pointer-events-none'>
        {/* Bouton toggle édition */}
        {/* Hors édition, le crayon ; en édition, « Terminer » : il enregistre et
            quitte, comme le « Terminé » d'Amazon — un seul geste évident. */}
        <motion.button
          onClick={() => {
            if (isEditMode) return void handleSave();
            // Le crayon de la barre ouvre toute la page.
            setEditPanelId(null);
            enterEditMode();
          }}
          disabled={isSaving}
          whileTap={{ scale: 0.95 }}
          data-tour={isEditMode ? 'save' : 'edit'}
          title={isEditMode ? t('dashboard.doneTooltip') : t('dashboard.editTooltipEnter')}
          aria-label={isEditMode ? t('dashboard.doneTooltip') : t('dashboard.editTooltipEnter')}
          className={cn(
            'pointer-events-auto flex h-[52px] items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition-colors disabled:opacity-60',
            isEditMode
              ? 'bg-[var(--ds-tile-on)] px-6 text-[var(--ds-tile-on-ink)]'
              : 'w-[52px] bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
          )}
        >
          {isEditMode ? isSaving ? <Loader2 size={20} className='animate-spin' /> : <Check size={20} /> : <PencilLine size={20} />}
          {isEditMode && <span className='hidden sm:inline'>{isSaving ? t('dashboard.saving') : t('dashboard.done')}</span>}
        </motion.button>

        <AnimatePresence>
          {isEditMode && (
            <motion.div
              key='edit-actions'
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ duration: DURATION_FAST }}
              className='flex items-center gap-2 pointer-events-auto'
            >
              {/* Dans un panneau : retour à la carte des panneaux. */}
              {editPanelId && (
                <button
                  onClick={() => setEditPanelId(null)}
                  className='flex h-11 items-center gap-1 rounded-full bg-[var(--ds-surface-3)] pl-3 pr-4 text-[15px] font-semibold text-[var(--ds-ink)]'
                >
                  <ChevronLeft size={18} />
                  {t('dashboard.backToLayout')}
                </button>
              )}

              {/* Aide — visite guidée et documentation */}
              <button
                onClick={() => setShowHelp(true)}
                data-tour='help'
                data-testid='help-button'
                title={t('help.title')}
                aria-label={t('help.title')}
                className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
              >
                <HelpCircle size={18} />
              </button>

              {/* Annuler / rétablir — Ctrl+Z et Ctrl+Maj+Z font la même chose.
                  Les boutons existent parce que le raccourci n'existe pas sur
                  une tablette murale, là où le glisser-déposer rate le plus. */}
              <div className='flex h-11 items-center overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  title={t('dashboard.undo')}
                  aria-label={t('dashboard.undo')}
                  className='flex h-full w-11 items-center justify-center text-[var(--ds-ink)] disabled:opacity-25'
                >
                  <Undo2 size={18} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  title={t('dashboard.redo')}
                  aria-label={t('dashboard.redo')}
                  className='flex h-full w-11 items-center justify-center text-[var(--ds-ink)] disabled:opacity-25'
                >
                  <Redo2 size={18} />
                </button>
              </div>

              {/* Actions groupées — n'apparaissent qu'avec une sélection. */}
              {selection.selected.size > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ds-radius-md)] bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'>
                  <span className='text-[var(--ds-accent)] text-xs font-semibold tabular-nums'>
                    {t('dashboard.selectionCount', { value: selection.selected.size })}
                  </span>
                  <button
                    onClick={() => {
                      removeWidgets([...selection.selected]);
                      selection.clear();
                    }}
                    title={t('dashboard.selectionDelete')}
                    aria-label={t('dashboard.selectionDelete')}
                    className='p-1 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)] transition-colors'
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={selection.clear}
                    title={t('dashboard.selectionClear')}
                    aria-label={t('dashboard.selectionClear')}
                    className='p-1 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Ajouter : un panneau sur la carte, une tuile dans un panneau.
                  `title` : sous 640 px le libellé disparaît, le bouton se
                  retrouverait sans nom accessible. */}
              <button
                onClick={() => (editPanelId ? setShowAddModal(true) : addPanel())}
                data-tour='add'
                title={editPanelId ? t('layout.panel.addTile') : t('layout.panel.addPanel')}
                className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4 text-[15px] font-semibold text-[var(--ds-ink)]'
              >
                <Plus size={18} />
                <span className='hidden sm:inline'>{editPanelId ? t('layout.panel.addTile') : t('layout.panel.addPanel')}</span>
              </button>

              {/* Abandonner les modifications — confirmé par un second appui. */}
              <button
                onClick={handleDiscard}
                title={t('dashboard.discardTooltip')}
                aria-label={t('dashboard.discardTooltip')}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-full text-[15px] font-semibold',
                  confirmingDiscard ? 'bg-[var(--ds-alert)] px-4 text-white' : 'w-11 bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                )}
              >
                <X size={18} />
                {confirmingDiscard && <span>{t('dashboard.discardConfirm')}</span>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal ajout de widget */}
      <AnimatePresence>{showAddModal && <AddWidgetModal panelId={editPanelId ?? undefined} onClose={() => setShowAddModal(false)} />}</AnimatePresence>

      {/* Aide / documentation */}
      <AnimatePresence>{showHelp && <HelpModal onClose={() => setShowHelp(false)} />}</AnimatePresence>

      {/* Code de verrouillage du mode édition */}
      {pinPrompt && (
        <div
          data-overlay
          className='fixed inset-0 z-[120] flex items-center justify-center bg-black/60'
          onClick={() => setPinPrompt(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className='w-[min(90vw,320px)] rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] text-[var(--ds-ink)] p-5 shadow-[var(--ds-shadow-sheet)]'
          >
            <h3 className='text-[var(--ds-ink)] text-sm font-semibold mb-1'>{t('dashboard.pinTitle')}</h3>
            <p className='text-[var(--ds-ink-muted)] text-xs mb-4'>{t('dashboard.pinDesc')}</p>
            <input
              autoFocus
              type='password'
              inputMode='numeric'
              value={pinEntry}
              onChange={e => {
                setPinEntry(e.target.value);
                setPinWrong(false);
              }}
              onKeyDown={e => e.key === 'Enter' && submitPin()}
              className='w-full bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] rounded-[var(--ds-radius-sm)] px-3 py-2 text-[var(--ds-ink)] text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:border-[var(--ds-accent)]'
            />
            {pinWrong && <p className='text-[var(--ds-alert)] text-xs mt-2'>{t('dashboard.pinWrong')}</p>}
            <div className='flex gap-2 mt-4'>
              <button
                onClick={() => setPinPrompt(false)}
                className='flex-1 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] text-xs font-semibold transition-colors'
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitPin}
                className='flex-1 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)] text-xs font-semibold transition-colors'
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

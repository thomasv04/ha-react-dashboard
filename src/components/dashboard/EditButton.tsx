import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { PencilLine, Check, X, CloudUpload, Plus, Loader2, LayoutGrid, HelpCircle, Undo2, Redo2, Trash2 } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGridSelection } from '@/components/layout/DashboardGrid';
import { useTheme } from '@/context/ThemeContext';

export function EditButton() {
  const { t } = useI18n();
  const user = useUser();
  const { isEditMode, setEditMode } = useEditMode();
  const { saveLayout, allLayouts, packLayout, undo, redo, canUndo, canRedo, removeWidgets } = useDashboardLayout();
  // Le tassement ne s'applique qu'au breakpoint affiché : les trois
  // dispositions sont indépendantes. Les deux hooks sont appelés
  // inconditionnellement — les enchaîner dans un ternaire sauterait le second
  // appel selon le résultat du premier.
  const isNarrow = useIsMobile(768);
  const isMedium = useIsMobile(1200);
  const breakpoint: 'lg' | 'md' | 'sm' = isNarrow ? 'sm' : isMedium ? 'md' : 'lg';
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { pages } = usePages();
  const { config: wpConfig, wallPanelLayout } = useWallPanel();
  const { panels: customPanels, dock } = useCustomPanels();
  const selection = useGridSelection();

  const { saveConfig, isSaving } = useDashboardConfig();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { behaviourSettings } = useTheme();
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinWrong, setPinWrong] = useState(false);

  if (!user?.is_admin) return null;

  /**
   * Entrée en édition, éventuellement derrière un code.
   *
   * Le code est un **garde-fou**, pas une sécurité : il vit côté client, qui
   * peut le lire. Il empêche le geste involontaire sur une tablette murale —
   * la vraie protection des écritures est côté serveur (`adminWrites`).
   */
  const enterEditMode = () => {
    if (!behaviourSettings.editPin) return setEditMode(true);
    setPinEntry('');
    setPinWrong(false);
    setPinPrompt(true);
  };

  const submitPin = () => {
    if (pinEntry !== behaviourSettings.editPin) return setPinWrong(true);
    setPinPrompt(false);
    setEditMode(true);
  };

  const handleSave = async () => {
    saveLayout();
    await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: {
        config: wpConfig,
        layout: wallPanelLayout,
        widgetConfigs: {},
      },
      customPanels,
      dock,
    });
    setEditMode(false);
  };

  return (
    <>
      {/* `left-16` + `flex-wrap` : la barre partait vers la gauche sans limite
          et, sur mobile, passait sous le bouton Apparence (fixe en haut à
          gauche) puis débordait de l'écran. Bornée à droite du bouton, elle
          repasse à la ligne au lieu de recouvrir quoi que ce soit. */}
      {/* `pointer-events-none` : la barre s'étend sur toute la largeur alors que
          ses boutons sont calés à droite. Au-dessus de `lg` la rangée d'onglets
          repasse sous elle (`lg:mt-0`), et cette bande vide interceptait les
          clics sur WallPanel et Panneaux — seuls leurs derniers pixels
          répondaient. Les enfants réactivent le pointeur. */}
      <div className='fixed top-4 left-16 right-4 z-50 flex flex-wrap items-center justify-end gap-2 pointer-events-none'>
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              key='edit-actions'
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: DURATION_FAST }}
              className='flex items-center gap-2 pointer-events-auto'
            >
              {/* Aide — visite guidée et documentation */}
              <button
                onClick={() => setShowHelp(true)}
                data-tour='help'
                data-testid='help-button'
                title={t('help.title')}
                aria-label={t('help.title')}
                className='p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-sm'
              >
                <HelpCircle size={15} />
              </button>

              {/* Annuler / rétablir — Ctrl+Z et Ctrl+Maj+Z font la même chose.
                  Les boutons existent parce que le raccourci n'existe pas sur
                  une tablette murale, là où le glisser-déposer rate le plus. */}
              <div className='flex items-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm overflow-hidden'>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  title={t('dashboard.undo')}
                  aria-label={t('dashboard.undo')}
                  className='p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25 disabled:hover:bg-transparent'
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  title={t('dashboard.redo')}
                  aria-label={t('dashboard.redo')}
                  className='p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-25 disabled:hover:bg-transparent'
                >
                  <Redo2 size={15} />
                </button>
              </div>

              {/* Actions groupées — n'apparaissent qu'avec une sélection. */}
              {selection.selected.size > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 backdrop-blur-sm'>
                  <span className='text-blue-200 text-xs font-semibold tabular-nums'>
                    {t('dashboard.selectionCount', { value: selection.selected.size })}
                  </span>
                  <button
                    onClick={() => {
                      removeWidgets([...selection.selected]);
                      selection.clear();
                    }}
                    title={t('dashboard.selectionDelete')}
                    aria-label={t('dashboard.selectionDelete')}
                    className='p-1 rounded-lg text-red-300 hover:bg-red-500/25 transition-colors'
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={selection.clear}
                    title={t('dashboard.selectionClear')}
                    aria-label={t('dashboard.selectionClear')}
                    className='p-1 rounded-lg text-white/60 hover:bg-white/15 hover:text-white transition-colors'
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Bouton Ajouter */}
              {/* `title` : sous 640 px le libellé disparaît, le bouton se
                  retrouverait sans nom accessible. */}
              <button
                onClick={() => setShowAddModal(true)}
                data-tour='add'
                title={t('common.add')}
                className='flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors backdrop-blur-sm'
              >
                <Plus size={15} />
                <span className='hidden sm:inline'>{t('common.add')}</span>
              </button>

              {/* Réorganiser — referme les trous de la mise en page courante.
                  Action explicite, jamais automatique : appliquée sans le
                  demander à une mise en page desktop soignée, elle déplacerait
                  presque tous les widgets. Ne concerne que le breakpoint
                  affiché, et reste annulable tant qu'on n'a pas sauvegardé. */}
              <button
                onClick={() => packLayout(breakpoint)}
                title={t('dashboard.packTooltip')}
                className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-colors backdrop-blur-sm'
              >
                <LayoutGrid size={15} />
                <span className='hidden sm:inline'>{t('dashboard.pack')}</span>
              </button>

              {/* Bouton Sauvegarder */}
              <button
                onClick={handleSave}
                data-tour='save'
                disabled={isSaving}
                title={t('common.save')}
                className='flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 hover:text-green-100 text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50'
              >
                {isSaving ? <Loader2 size={15} className='animate-spin' /> : <CloudUpload size={15} />}
                <span className='hidden sm:inline'>{isSaving ? t('dashboard.saving') : t('common.save')}</span>
              </button>

              {/* Bouton Annuler */}
              <button
                onClick={() => setEditMode(false)}
                className='p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-colors backdrop-blur-sm'
                title={t('dashboard.cancelTooltip')}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton toggle édition */}
        <motion.button
          onClick={() => (isEditMode ? setEditMode(false) : enterEditMode())}
          whileTap={{ scale: 0.92 }}
          data-tour='edit'
          title={isEditMode ? t('dashboard.editTooltipExit') : t('dashboard.editTooltipEnter')}
          className={`p-2.5 rounded-xl border transition-colors backdrop-blur-sm pointer-events-auto ${
            isEditMode
              ? 'bg-purple-500/30 border-purple-500/50 text-purple-200'
              : 'bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20'
          }`}
        >
          {isEditMode ? <Check size={17} /> : <PencilLine size={17} />}
        </motion.button>
      </div>

      {/* Modal ajout de widget */}
      <AnimatePresence>{showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}</AnimatePresence>

      {/* Aide / documentation */}
      <AnimatePresence>{showHelp && <HelpModal onClose={() => setShowHelp(false)} />}</AnimatePresence>

      {/* Code de verrouillage du mode édition */}
      {pinPrompt && (
        <div
          className='fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm'
          onClick={() => setPinPrompt(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className='w-[min(90vw,320px)] rounded-2xl bg-[#12121f] border border-white/12 p-5 shadow-2xl'
          >
            <h3 className='text-white/85 text-sm font-semibold mb-1'>{t('dashboard.pinTitle')}</h3>
            <p className='text-white/40 text-xs mb-4'>{t('dashboard.pinDesc')}</p>
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
              className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/85 text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500/40'
            />
            {pinWrong && <p className='text-red-400 text-xs mt-2'>{t('dashboard.pinWrong')}</p>}
            <div className='flex gap-2 mt-4'>
              <button
                onClick={() => setPinPrompt(false)}
                className='flex-1 px-3 py-2 rounded-lg bg-white/8 border border-white/12 text-white/60 hover:text-white text-xs font-semibold transition-colors'
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={submitPin}
                className='flex-1 px-3 py-2 rounded-lg bg-blue-500/25 border border-blue-500/40 text-blue-200 hover:bg-blue-500/35 text-xs font-semibold transition-colors'
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

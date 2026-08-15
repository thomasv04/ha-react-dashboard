import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { PencilLine, Check, X, CloudUpload, Plus, Loader2, LayoutGrid, HelpCircle } from 'lucide-react';
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

export function EditButton() {
  const { t } = useI18n();
  const user = useUser();
  const { isEditMode, setEditMode } = useEditMode();
  const { saveLayout, allLayouts, packLayout } = useDashboardLayout();
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
  const { panels: customPanels } = useCustomPanels();

  const { saveConfig, isSaving } = useDashboardConfig();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  if (!user?.is_admin) return null;

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
          onClick={() => setEditMode(!isEditMode)}
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
    </>
  );
}

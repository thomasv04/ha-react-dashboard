import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { PencilLine, Check, X, CloudUpload, Plus, Loader2 } from 'lucide-react';
import { useUser } from '@hakit/core';
import { useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { usePages } from '@/context/PageContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { useI18n } from '@/i18n';

export function EditButton() {
  const { t } = useI18n();
  const user = useUser();
  const { isEditMode, setEditMode } = useEditMode();
  const { saveLayout, allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { pages } = usePages();
  const { config: wpConfig, wallPanelLayout } = useWallPanel();
  const { panels: customPanels } = useCustomPanels();

  const { saveConfig, isSaving } = useDashboardConfig();

  const [showAddModal, setShowAddModal] = useState(false);

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
      <div className='fixed top-4 right-4 z-50 flex items-center gap-2'>
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              key='edit-actions'
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: DURATION_FAST }}
              className='flex items-center gap-2'
            >
              {/* Bouton Ajouter */}
              <button
                onClick={() => setShowAddModal(true)}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors backdrop-blur-sm'
              >
                <Plus size={15} />
                {t('common.add')}
              </button>

              {/* Bouton Sauvegarder */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 hover:text-green-100 text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50'
              >
                {isSaving ? <Loader2 size={15} className='animate-spin' /> : <CloudUpload size={15} />}
                {isSaving ? t('dashboard.saving') : t('common.save')}
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
          title={isEditMode ? t('dashboard.editTooltipExit') : t('dashboard.editTooltipEnter')}
          className={`p-2.5 rounded-xl border transition-colors backdrop-blur-sm ${
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
    </>
  );
}

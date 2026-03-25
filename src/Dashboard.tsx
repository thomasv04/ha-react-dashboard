import { PanelProvider, usePanel } from '@/context/PanelContext';
import { DashboardLayoutProvider, useDashboardLayout, WIDGET_CATALOG } from '@/context/DashboardLayoutContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PanelOverlay } from '@/components/layout/Panel';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { useUser } from '@hakit/core';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilLine, Check, X, CloudUpload, Plus, Loader2 } from 'lucide-react';

// 👉 NOUVEAU : Import de notre hook backend !
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

// Cards
import { ClockWidget } from '@/components/cards/GreetingCard';
import { WeatherCard } from '@/components/cards/WeatherCard';
import { EnergyCard } from '@/components/cards/EnergyCard';
import { TempoCard } from '@/components/cards/TempoCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard';
import { RoomsGrid } from '@/components/cards/RoomsGrid';
import { ActivityBar } from '@/components/cards/ActivityBar';
import { ShortcutsCard } from '@/components/cards/ShortcutsCard';
import { CameraCard } from '@/components/cards/CameraCard';

// Panels
import { ShuttersPanel } from '@/components/panels/ShuttersPanel';
import { LightsPanel } from '@/components/panels/LightsPanel';
import { VacuumPanel } from '@/components/panels/VacuumPanel';
import { SecurityPanel } from '@/components/panels/SecurityPanel';
import { NotificationsPanel } from '@/components/panels/NotificationsPanel';
import { FlowersPanel } from '@/components/panels/FlowersPanel';
import { CameraPanel } from '@/components/panels/CameraPanel';

/**
 * Bouton flottant d'édition visible uniquement par les admins.
 * - Affiche/masque le mode édition (overlays sur chaque card)
 * - Propose de sauvegarder dans Node.js (dossier /data HA)
 */
function EditButton() {
  const user = useUser();
  const { isEditMode, setEditMode, saveLayout, layout, addWidgetByType } = useDashboardLayout();
  
  // 👉 NOUVEAU : On récupère la fonction de sauvegarde de notre backend Node
  const { saveConfig, isSaving } = useDashboardConfig();
  
  const [showAddModal, setShowAddModal] = useState(false);

  if (!user?.is_admin) return null;

  // Widgets présents dans le layout lg (référence)
  const presentTypes = new Set(layout.widgets.lg.map(w => w.type));
  const addable = WIDGET_CATALOG.filter(c => !presentTypes.has(c.type));

  const handleSave = async () => {
    saveLayout(); // Met à jour le state local
    
    // On envoie directement le layout brut (et pas un objet { layout: layout })
    await saveConfig(layout); 
    
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
              transition={{ duration: 0.2 }}
              className='flex items-center gap-2'
            >
              {/* Bouton Ajouter */}
              <button
                onClick={() => setShowAddModal(true)}
                disabled={addable.length === 0}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-35 disabled:cursor-not-allowed'
              >
                <Plus size={15} />
                Ajouter
              </button>
              
              {/* Bouton Sauvegarder */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 hover:text-green-100 text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50'
              >
                {/* Petit spinner si ça sauvegarde */}
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              
              {/* Bouton Annuler */}
              <button
                onClick={() => setEditMode(false)}
                className='p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-colors backdrop-blur-sm'
                title='Annuler'
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
          title={isEditMode ? 'Quitter le mode édition' : 'Modifier le dashboard'}
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
      <AnimatePresence>
        {showAddModal && (
          <>
            {/* Fond flou */}
            <motion.div
              key='add-modal-backdrop'
              className='fixed inset-0 z-[60] bg-black/55'
              style={{ backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            />
            {/* Modal */}
            <motion.div
              key='add-modal'
              className='fixed inset-0 z-[61] flex items-center justify-center pointer-events-none'
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className='pointer-events-auto w-full max-w-md mx-4 rounded-2xl border border-white/12 p-5 shadow-2xl'
                style={{ background: 'rgba(12, 16, 40, 0.95)', backdropFilter: 'blur(20px)' }}
              >
                <div className='flex items-center justify-between mb-5'>
                  <div>
                    <h2 className='text-white font-semibold text-base'>Ajouter un widget</h2>
                    <p className='text-white/35 text-xs mt-0.5'>Sélectionne un widget à remettre sur le dashboard</p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className='p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors'
                  >
                    <X size={16} />
                  </button>
                </div>

                {addable.length === 0 ? (
                  <p className='text-white/35 text-sm text-center py-4'>Tous les widgets sont déjà présents sur le dashboard.</p>
                ) : (
                  <div className='grid grid-cols-2 gap-2.5'>
                    {addable.map(w => (
                      <button
                        key={w.type}
                        onClick={() => {
                          addWidgetByType(w.type);
                          setShowAddModal(false);
                        }}
                        className='rounded-xl p-4 flex flex-col gap-1.5 text-left border border-white/8 hover:border-white/20 transition-all group'
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <span className='text-white/80 group-hover:text-white font-medium text-sm transition-colors'>{w.label}</span>
                        <span className='text-white/30 text-[11px]'>
                          {w.lg.w} col × {w.lg.h} rangée{w.lg.h > 1 ? 's' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ActivePanel() {
  const { activePanel } = usePanel();
  switch (activePanel) {
    case 'volets':
      return <ShuttersPanel />;
    case 'lumieres':
      return <LightsPanel />;
    case 'aspirateur':
      return <VacuumPanel />;
    case 'security':
      return <SecurityPanel />;
    case 'notifications':
      return <NotificationsPanel />;
    case 'flowers':
      return <FlowersPanel />;
    case 'cameras':
      return <CameraPanel />;
    case 'alarme':
      return <SecurityPanel />;
    default:
      return null;
  }
}

function DashboardContent() {
  return (
    <div
      className='min-h-screen w-full text-white overflow-x-hidden'
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}bg.svg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className='max-w-[1440px] mx-auto px-5 pt-5 pb-24'>
        <DashboardGrid>
          {/* Activity bar - ligne 1 (sticky) */}
          <GridItem id='activity'>
            <ActivityBar />
          </GridItem>

          {/* Row 2: Camera (grande) + Weather + Thermostat */}
          <GridItem id='camera'>
            <CameraCard />
          </GridItem>
          <GridItem id='weather'>
            <WeatherCard />
          </GridItem>
          <GridItem id='thermostat'>
            <ThermostatCard />
          </GridItem>

          {/* Row 3: Rooms + Shortcuts + Greeting */}
          <GridItem id='rooms'>
            <RoomsGrid />
          </GridItem>
          <GridItem id='shortcuts'>
            <ShortcutsCard />
          </GridItem>
          <GridItem id='greeting'>
            <ClockWidget />
          </GridItem>

          {/* Row 4: Tempo + Energy (bas droite) */}
          <GridItem id='tempo'>
            <TempoCard />
          </GridItem>
          <GridItem id='energy'>
            <EnergyCard />
          </GridItem>
        </DashboardGrid>
      </div>

      {/* Bouton d'édition admin (fixe, top-right) */}
      <EditButton />

      {/* Bottom nav */}
      <BottomNav />

      {/* Panel overlay */}
      <PanelOverlay>
        <ActivePanel />
      </PanelOverlay>
    </div>
  );
}

function Dashboard() {
  // 👉 NOUVEAU : On empêche l'affichage tant que Node n'a pas répondu !
  const { isLoading, config } = useDashboardConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0c1028] text-white">
        <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
        <p className="text-white/60">Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    // Note: Idéalement, tu devrais passer "config" à ton DashboardLayoutProvider 
    // pour qu'il initialise ses widgets avec ce qui vient du serveur !
    <DashboardLayoutProvider initialLayout={config}>
      <PanelProvider>
        <DashboardContent />
      </PanelProvider>
    </DashboardLayoutProvider>
  );
}

export default Dashboard;
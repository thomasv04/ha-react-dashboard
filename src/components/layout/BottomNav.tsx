import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, LayoutGrid, Plus, Settings2, X } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useRef } from 'react';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useI18n } from '@/i18n';

export function BottomNav() {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { t } = useI18n();
  const { openPanel, closePanel, activePanel } = usePanel();
  const { panels, dock, setDock } = useCustomPanels();
  const { isEditMode } = useEditMode();
  const isWideDock = !useIsMobile(1024);
  const [showDockEditor, setShowDockEditor] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Le dock est enregistré avec la configuration du dashboard : composé ici, il
  // apparaît tel quel sur les autres appareils au prochain chargement.
  const dockIds = dock.panels;
  const showLabels = dock.labels;
  const setDockIds = (next: string[] | ((prev: string[]) => string[])) =>
    setDock({ ...dock, panels: typeof next === 'function' ? next(dockIds) : next });
  const setShowLabels = (next: boolean | ((prev: boolean) => boolean)) =>
    setDock({ ...dock, labels: typeof next === 'function' ? next(showLabels) : next });

  useEffect(() => {
    if (!isEditMode) setShowDockEditor(false);
  }, [isEditMode]);

  useEffect(() => {
    if (!showDockEditor) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // Les selects du popover s'affichent dans un portail sur <body> : sans
      // cette exception, choisir un panneau fermait l'éditeur de dock.
      if (target?.closest?.('[data-portal-dropdown]')) return;
      if (editorRef.current && !editorRef.current.contains(target as Node)) {
        setShowDockEditor(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDockEditor]);

  // Un panneau supprimé disparaît du dock sans laisser de trou.
  const dockPanels = dockIds.map(id => panels.find(p => p.id === id)).filter((p): p is (typeof panels)[number] => !!p);
  const available = panels.filter(p => !dockIds.includes(p.id));

  const addToDock = (id: string) => setDockIds(prev => [...prev, id]);
  const removeFromDock = (id: string) => setDockIds(prev => prev.filter(v => v !== id));

  // Rien à afficher tant que l'utilisateur n'a pas créé de panneau — sauf en
  // mode édition, où la pastille porte le bouton d'ajout.
  if (dockPanels.length === 0 && !isEditMode) return null;

  return (
    // z-[55] : au-dessus de la couche des panneaux (z-50), qui posait un
    // capteur de clic plein écran par-dessus le dock — il fallait donc un clic
    // pour fermer le panneau puis un second pour en ouvrir un autre. Le dock
    // reste sous les modales plein écran (z-60+). Le <nav> est
    // `pointer-events-none` : seule la pastille capte les clics, le reste de la
    // bande laisse passer la fermeture au clic extérieur.
    <nav className='fixed bottom-0 left-0 right-0 z-[55] flex flex-col items-center pointer-events-none'>
      {/* Dock editor popover */}
      <AnimatePresence>
        {showDockEditor && (
          <motion.div
            ref={editorRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className='pointer-events-auto mb-3 w-80 max-h-[60vh] overflow-y-auto'
          >
            <div className='gc-overlay rounded-2xl px-3 py-3 flex flex-col gap-1'>
              {/* Header + labels toggle */}
              <div className='flex items-center gap-2 px-1 mb-1'>
                <p className='text-white/40 text-[10px] font-semibold uppercase tracking-wider flex-1'>{t('layout.customizeDock')}</p>
                <button
                  onClick={() => setShowLabels(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
                    showLabels ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-white/5 text-white/30 hover:bg-white/8'
                  )}
                >
                  <span>{showLabels ? t('layout.dockLabelsOn') : t('layout.dockLabelsOff')}</span>
                  <div className={cn('w-6 h-3.5 rounded-full transition-colors relative', showLabels ? 'bg-blue-500/70' : 'bg-white/15')}>
                    <div
                      className={cn(
                        'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all',
                        showLabels ? 'right-0.5' : 'left-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>

              <Reorder.Group axis='y' values={dockIds} onReorder={setDockIds} className='flex flex-col gap-1'>
                {dockPanels.map(panel => {
                  const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
                  return (
                    <Reorder.Item
                      key={panel.id}
                      value={panel.id}
                      className='flex items-center gap-2 px-2 py-2 rounded-xl transition-colors hover:bg-white/5 cursor-grab active:cursor-grabbing'
                    >
                      <GripVertical size={13} className='text-white/25 shrink-0' />
                      <Icon size={16} className='text-white/60 shrink-0' />
                      <span className='text-white/75 text-sm font-medium flex-1 truncate'>{panel.name}</span>
                      <button
                        onClick={() => removeFromDock(panel.id)}
                        className='p-1 rounded-lg hover:bg-white/10 transition-colors text-white/35 hover:text-white/70 shrink-0'
                        title={t('layout.dockRemove')}
                        aria-label={t('layout.dockRemove')}
                      >
                        <X size={14} />
                      </button>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

              {/* Panneaux disponibles */}
              {available.length > 0 && (
                <>
                  <p className='text-white/25 text-[10px] font-semibold uppercase tracking-wider px-1 pt-2 pb-1'>{t('layout.dockAdd')}</p>
                  {available.map(panel => {
                    const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
                    return (
                      <button
                        key={panel.id}
                        onClick={() => addToDock(panel.id)}
                        className='flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors hover:bg-white/5'
                      >
                        <Plus size={13} className='text-white/30 shrink-0' />
                        <Icon size={16} className='text-white/50 shrink-0' />
                        <span className='text-white/55 text-sm flex-1 truncate'>{panel.name}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {panels.length === 0 && <p className='text-white/30 text-xs px-1 py-2 leading-relaxed'>{t('layout.dockNoPanels')}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock pill
          Chaque item n'affichait qu'une icône de 36 px surmontée d'un libellé de
          9 px masqué sous 640 px : sur téléphone, des icônes anonymes collées
          bord à bord. Désormais seul l'item actif porte son libellé, dans une
          pastille qui se déplie — lisible à toutes les largeurs, et la barre
          défile horizontalement si le dock déborde. */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className='pointer-events-auto mb-3 px-3 max-w-full'
        style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        data-tour='dock'
      >
        <div
          className='flex items-center gap-1 p-1.5 rounded-[26px] max-w-full overflow-x-auto scrollbar-none'
          style={{
            background: 'var(--dash-bg-card, rgba(6,6,24,0.78))',
            backdropFilter: 'blur(56px) saturate(180%)',
            WebkitBackdropFilter: 'blur(56px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'var(--dash-elev-overlay)',
          }}
        >
          {dockPanels.map(panel => {
            const target: PanelId = `custom:${panel.id}`;
            const isActive = target === activePanel;
            const Icon = resolveIcon(panel.icon) ?? LayoutGrid;

            // Au-delà de 1024 px (tablette murale en paysage) tout tient :
            // chaque pastille porte son libellé. En dessous, seul l'item actif
            // se déplie — des icônes anonymes ne se distinguent pas.
            const showLabel = showLabels && (isActive || isWideDock);

            return (
              <motion.button
                key={panel.id}
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                whileTap={{ scale: 0.93 }}
                // Un panneau ouvert se remplace directement par un autre ; et
                // retaper l'item actif le referme (bascule).
                onClick={() => {
                  if (isEditMode) return;
                  if (isActive) closePanel();
                  else openPanel(target);
                }}
                className={cn(
                  'relative h-11 shrink-0 rounded-[18px] flex items-center justify-center select-none border transition-colors duration-200',
                  showLabel ? 'gap-2 px-3' : 'w-11',
                  isActive ? 'bg-white/12 border-white/20' : 'bg-transparent border-transparent hover:bg-white/8'
                )}
                title={panel.name}
                aria-label={panel.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={22} className={cn('transition-colors duration-200 shrink-0', isActive ? 'text-white' : 'text-white/55')} />

                {showLabel && (
                  <motion.span
                    layout='position'
                    className={cn('text-[13px] font-semibold leading-none whitespace-nowrap', isActive ? 'text-white' : 'text-white/55')}
                  >
                    {panel.name}
                  </motion.span>
                )}
              </motion.button>
            );
          })}

          {/* Settings button — edit mode only */}
          <AnimatePresence>
            {isEditMode && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 44 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowDockEditor(v => !v)}
                className='relative h-11 shrink-0 rounded-[18px] flex items-center justify-center select-none overflow-hidden border transition-colors'
                style={
                  showDockEditor
                    ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.20)' }
                    : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }
                }
                title={t('layout.customizeDock')}
                aria-label={t('layout.customizeDock')}
              >
                <motion.span
                  animate={{ rotate: showDockEditor ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className='text-white/70'
                >
                  <Settings2 size={20} />
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </nav>
  );
}

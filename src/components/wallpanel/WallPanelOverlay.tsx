import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { DURATION_HERO, EASE_OUT } from '@/lib/motion-tokens';
import { useScreensaverPlan, useWallPanel } from '@/context/WallPanelContext';
import { gesturesOf } from '@/types/wallpanel';
import { BackgroundSlideshow, type SlideshowHandle } from './BackgroundSlideshow';
import { WallPanelEditShell, WallPanelReadonlyShell } from './WallPanelEditShell';
import { GestureLayer } from './GestureLayer';
import { EdgeHints } from './EdgeHints';
import { QuickPanelSheet } from './QuickPanelSheet';
import { NotificationSheet } from './NotificationSheet';
import { NotificationBadge } from './NotificationBadge';
import { ScreensaverClock } from './ScreensaverClock';
import { useI18n } from '@/i18n';
import { useUser } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { usePages } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import type { WallPanelSave } from './WallPanelEditShell';
import { layoutWidgets } from '@/lib/panel-grid';

type Sheet = 'quick' | 'notifications';

/**
 * Coque d'édition, plus l'enregistrement sur le serveur.
 *
 * Montée seulement pendant une session d'édition : `useDashboardConfig` ouvre
 * sa propre requête de configuration, inutile tant que personne n'édite. Ici et
 * non dans la coque elle-même, dont les providers isolés masquent justement la
 * configuration du dashboard (pages, dispositions, panneaux) qu'il faut
 * réenregistrer avec.
 */
function WallPanelEditSession() {
  const { config } = useWallPanel();
  const { pages } = usePages();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { panels: customPanels, dock } = useCustomPanels();
  const { saveConfig } = useDashboardConfig();

  // « Enregistrer » n'écrivait que dans le contexte : il fallait ensuite
  // repasser le dashboard en édition et l'enregistrer *aussi*, faute de quoi
  // les widgets de la veille disparaissaient au rechargement.
  const persist: WallPanelSave = useCallback(
    (layout, widgetConfigs) => {
      return saveConfig({
        version: 2,
        pages,
        layouts: allLayouts,
        widgetConfigs: allWidgetConfigsByPage,
        wallPanel: { config, layout, widgetConfigs },
        customPanels,
        dock,
      });
    },
    [saveConfig, pages, allLayouts, allWidgetConfigsByPage, config, customPanels, dock]
  );

  return <WallPanelEditShell onSave={persist} />;
}

export function WallPanelOverlay() {
  const { t } = useI18n();
  const user = useUser();
  const { isActive, deactivate, wallPanelLayout, config, isWallPanelEditMode, enterWallPanelEditMode } = useWallPanel();
  const hasWidgets = layoutWidgets(wallPanelLayout).length > 0;
  // Fond sur une maquette : la page Plan, que la veille a ouverte dessous, se
  // voit au travers — ni voile noir, ni photos.
  const planBackdrop = !!useScreensaverPlan();
  // Seul un `off` explicite masque : capteur indisponible ou introuvable, les
  // widgets restent affichés plutôt que de disparaître sur une panne.
  const presence = useSafeEntity(config.presence_entity ?? '');
  const awayFromTablet = presence?.state === 'off';

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const slideshowRef = useRef<SlideshowHandle>(null);
  /** Vrai après un balayage, jusqu'à ce que le clic de fin de geste soit ignoré. */
  const movedRef = useRef(false);
  const backgroundX = useMotionValue(0);
  const backgroundY = useMotionValue(0);

  const gestures = gesturesOf(config);
  const gesturesOn = gestures.enabled && !isWallPanelEditMode;
  const canSwipePhotos = gesturesOn && gestures.photos && photoCount > 1;
  const canOpenQuick = gesturesOn && gestures.quickPanelId !== '';
  const canOpenNotifications = gesturesOn && gestures.notifications;

  // Clavier — miroir des gestes. Une tablette murale n'a pas de clavier, mais
  // l'écran de veille est aussi utilisé sur poste fixe.
  useEffect(() => {
    // `isActive` est indispensable : sans lui, les flèches armeraient une
    // feuille alors que l'écran de veille est éteint, et elle surgirait à
    // l'activation suivante.
    if (!isActive || isWallPanelEditMode) return;

    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          // La feuille d'abord : sinon on quitterait la veille en voulant
          // simplement refermer le menu.
          if (sheet) setSheet(null);
          else deactivate();
          break;
        case 'ArrowLeft':
          if (canSwipePhotos) slideshowRef.current?.go(-1);
          break;
        case 'ArrowRight':
          if (canSwipePhotos) slideshowRef.current?.go(1);
          break;
        case 'ArrowUp':
          if (!sheet && canOpenQuick) setSheet('quick');
          break;
        case 'ArrowDown':
          if (!sheet && canOpenNotifications) setSheet('notifications');
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, deactivate, isWallPanelEditMode, sheet, canSwipePhotos, canOpenQuick, canOpenNotifications]);

  /**
   * Un balayage se termine par un `click` : sans ce filtre, chaque geste
   * ferait sortir de l'écran de veille. Même principe que `useLongPress`.
   *
   * Le drapeau est remis à zéro au contact suivant, et non ici : un balayage
   * dont le `click` ne remonte pas (relâché hors de la fenêtre) avalerait
   * sinon l'appui d'après.
   */
  const handleDismiss = () => {
    if (movedRef.current) return;
    if (sheet) setSheet(null);
    else deactivate();
  };

  return (
    // `onExitComplete` : `sheet` survit à la désactivation puisque ce composant
    // reste monté — sans cette remise à zéro, la feuille ouverte au moment de
    // quitter réapparaîtrait à l'activation suivante.
    <AnimatePresence onExitComplete={() => setSheet(null)}>
      {isActive && (
        <>
          {/* ── Phase 1 : dim layer — fades in first for a nice page transition ── */}
          <motion.div
            key='wallpanel-dim'
            data-overlay
            className='fixed inset-0 z-[199] bg-black pointer-events-none'
            initial={{ opacity: 0 }}
            animate={{ opacity: planBackdrop ? 0 : 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_HERO, ease: 'easeIn' }}
          />

          {/* ── Phase 2 : full content (delayed) ── */}
          <motion.div
            key='wallpanel-overlay'
            className='fixed inset-0 z-[200] overflow-hidden select-none'
            style={{ cursor: isWallPanelEditMode ? 'default' : 'pointer' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            onPointerDownCapture={() => (movedRef.current = false)}
            onClick={isWallPanelEditMode ? undefined : handleDismiss}
            onKeyDown={isWallPanelEditMode ? undefined : e => (e.key === 'Enter' || e.key === ' ') && handleDismiss()}
            role={isWallPanelEditMode ? undefined : 'button'}
            tabIndex={isWallPanelEditMode ? undefined : 0}
            aria-label={isWallPanelEditMode ? undefined : t('layout.wallPanel.dismissOverlay')}
          >
            {/* Fond (slideshow ou dégradé). Le décalage suit le doigt pendant
                un balayage ; l'agrandissement recule le fond quand une feuille
                s'ouvre, ce qui donne la profondeur sans flou supplémentaire. */}
            <motion.div
              className='absolute inset-0'
              style={{ x: backgroundX, y: backgroundY }}
              animate={{ scale: sheet ? 1.04 : 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              {planBackdrop ? (
                // Assez sombre en haut pour cacher les onglets et lire l'heure.
                <div data-wallpanel-plan className='absolute inset-0 bg-gradient-to-b from-black/80 via-black/0 via-35% to-black/50' />
              ) : (
                <BackgroundSlideshow config={config} ref={slideshowRef} onCountChange={setPhotoCount} />
              )}
            </motion.div>

            {/* ── Gestes ── posés sous les widgets : une card garde la priorité */}
            {gesturesOn && !sheet && (
              <GestureLayer
                x={backgroundX}
                y={backgroundY}
                movedRef={movedRef}
                onSwipeX={canSwipePhotos ? direction => slideshowRef.current?.go(direction) : undefined}
                onSwipeUp={canOpenQuick ? () => setSheet('quick') : undefined}
                onSwipeDown={canOpenNotifications ? () => setSheet('notifications') : undefined}
              />
            )}

            {/* ── Widgets ── */}
            <div className='absolute inset-0 z-10 pointer-events-none' onClick={e => e.stopPropagation()}>
              {isWallPanelEditMode ? (
                // Mode édition – layout provider isolé avec drag/resize/add
                <WallPanelEditSession />
              ) : (
                // Mode lecture seule – also needs its own provider so GridItem
                // can look up widget positions from the wallpanel layout
                <AnimatePresence>
                  {hasWidgets && !awayFromTablet && (
                    <motion.div key='wallpanel-widgets' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <WallPanelReadonlyShell />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ── Poignées de bord ── */}
            {gesturesOn && gestures.hints && <EdgeHints horizontal={canSwipePhotos} up={canOpenQuick} down={canOpenNotifications} />}

            {/* ── Compteur de notifications ── */}
            {canOpenNotifications && !sheet && <NotificationBadge onOpen={() => setSheet('notifications')} />}

            {/* ── Feuilles ── */}
            <AnimatePresence>
              {sheet === 'quick' && <QuickPanelSheet key='quick' panelId={gestures.quickPanelId} onClose={() => setSheet(null)} />}
              {sheet === 'notifications' && <NotificationSheet key='notifications' onClose={() => setSheet(null)} />}
            </AnimatePresence>

            {/* ── L'heure, et les flèches des photos ──
                ⋮ ouvre l'édition, réservée aux administrateurs comme le crayon
                du dashboard : sans ce garde, n'importe qui passant devant la
                tablette murale pouvait éditer la disposition. */}
            {!isWallPanelEditMode && !sheet && (
              <ScreensaverClock
                layout={config.clock_layout ?? 'clock'}
                onPrev={canSwipePhotos ? () => slideshowRef.current?.go(-1) : undefined}
                onNext={canSwipePhotos ? () => slideshowRef.current?.go(1) : undefined}
                onMore={user?.is_admin ? enterWallPanelEditMode : undefined}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

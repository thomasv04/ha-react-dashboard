import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { WallPanelConfig } from '@/types/wallpanel';
import { DEFAULT_WALLPANEL_CONFIG } from '@/types/wallpanel';
import type { DashboardLayout } from '@/context/DashboardLayoutContext';
import { DEFAULT_LAYOUT } from '@/context/DashboardLayoutContext';

interface WallPanelContextValue {
  config: WallPanelConfig;
  updateConfig: (partial: Partial<WallPanelConfig>) => void;
  /** True si l'écran de veille est actif (overlay visible) */
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  /** Layout des widgets affichés sur l'overlay */
  wallPanelLayout: DashboardLayout;
  setWallPanelLayout: (layout: DashboardLayout) => void;
  /** Indique si le wallpanel a déjà été configuré */
  isConfigured: boolean;
  /**
   * Comme config.enabled, mais forcé à true si ?hrd_screensaver=true est dans l'URL.
   * À utiliser partout à la place de config.enabled.
   */
  enabled: boolean;
  /** Mode édition dédié pour les widgets de l'overlay */
  isWallPanelEditMode: boolean;
  enterWallPanelEditMode: () => void;
  exitWallPanelEditMode: () => void;
}

/** Paramètre d'URL qui force l'écran de veille. Voir `urlForced` plus bas. */
export const SCREENSAVER_PARAM = 'hrd_screensaver';

const WallPanelContext = createContext<WallPanelContextValue | null>(null);

interface WallPanelProviderProps {
  children: ReactNode;
  initialConfig?: WallPanelConfig;
  initialLayout?: DashboardLayout;
}

export function WallPanelProvider({ children, initialConfig, initialLayout }: WallPanelProviderProps) {
  const [config, setConfig] = useState<WallPanelConfig>(initialConfig ?? DEFAULT_WALLPANEL_CONFIG);
  const [isActive, setIsActive] = useState(false);
  const [isWallPanelEditMode, setIsWallPanelEditMode] = useState(false);
  const [wallPanelLayout, setWallPanelLayout] = useState<DashboardLayout>(
    initialLayout ?? { ...DEFAULT_LAYOUT, widgets: { lg: [], md: [], sm: [] } }
  );

  // La configuration servie arrive après le premier rendu : au démarrage, le
  // dashboard se peint depuis son cache local, et la réponse du serveur ne
  // tombe qu'ensuite. Sans cette adoption, l'écran de veille restait sur la
  // configuration mise en cache — donc sur une ancienne liste d'images, alors
  // que les widgets et les dispositions, eux, se mettaient à jour. C'est ce qui
  // faisait défiler des photos qui n'étaient plus dans la bibliothèque choisie.
  useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    if (initialLayout) setWallPanelLayout(initialLayout);
  }, [initialLayout]);

  // Force l'écran de veille quel que soit config.enabled.
  //
  // Le préfixe `hrd_` (ha-react-dashboard) et non `wp_` : le module WallPanel de
  // Home Assistant lit `?wp_enabled=true` de son côté et posait alors son propre
  // écran de veille par-dessus le nôtre — avec ses images, pas les nôtres.
  const urlForced = new URLSearchParams(window.location.search).get(SCREENSAVER_PARAM) === 'true';
  const enabled = config.enabled || urlForced;

  const isConfigured = config.image_urls.length > 0 || wallPanelLayout.widgets.lg.length > 0;

  const activate = useCallback(() => setIsActive(true), []);
  const deactivate = useCallback(() => {
    setIsActive(false);
    setIsWallPanelEditMode(false);
  }, []);
  const updateConfig = useCallback((partial: Partial<WallPanelConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);
  const enterWallPanelEditMode = useCallback(() => {
    setIsActive(true); // ensure overlay is visible
    setIsWallPanelEditMode(true);
  }, []);
  const exitWallPanelEditMode = useCallback(() => setIsWallPanelEditMode(false), []);

  // Activation forcée via URL param (?hrd_screensaver=true)
  useEffect(() => {
    if (urlForced) setIsActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WallPanelContext.Provider
      value={{
        config,
        updateConfig,
        isActive,
        activate,
        deactivate,
        wallPanelLayout,
        setWallPanelLayout,
        isConfigured,
        enabled,
        isWallPanelEditMode,
        enterWallPanelEditMode,
        exitWallPanelEditMode,
      }}
    >
      {children}
    </WallPanelContext.Provider>
  );
}

export function useWallPanel() {
  const ctx = useContext(WallPanelContext);
  if (!ctx) throw new Error('useWallPanel must be used within WallPanelProvider');
  return ctx;
}

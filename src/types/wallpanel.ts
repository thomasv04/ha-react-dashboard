export type MediaOrder = 'random' | 'sequential';
/** Bord de l'écran où la grille de widgets se colle. */
export type WidgetAnchor = 'top' | 'bottom' | 'left' | 'right';
export type ImageFit = 'contain' | 'cover' | 'fill';

export interface WallPanelStyle {
  /** Flou de l'image de fond (pixels) */
  backgroundBlur?: number;
  /** Opacité de la boîte d'info (0-1) */
  infoBoxOpacity?: number;
  /** Largeur de la boîte d'info (px) */
  infoBoxWidth?: number;
  /**
   * En mode "contain", affiche une version floue et agrandie de l'image
   * en fond pour remplir les bandes noires (même effet que HA WallPanel
   * wallpanel-screensaver-image-background).
   */
  containBlurBackground?: boolean;
}

export interface WallPanelGestures {
  /** Interrupteur global des gestes tactiles */
  enabled: boolean;
  /** Balayage horizontal → photo précédente / suivante */
  photos: boolean;
  /** Panneau custom ouvert par le balayage vers le haut. '' = geste désactivé */
  quickPanelId: string;
  /** Balayage vers le bas → notifications Home Assistant */
  notifications: boolean;
  /** Poignées de bord affichées quelques secondes à l'activation */
  hints: boolean;
}

export interface WallPanelConfig {
  /** Activer l'écran de veille */
  enabled: boolean;
  /** Délai d'inactivité avant activation (secondes). 0 = jamais automatique */
  idle_time: number;
  /** URLs des images de fond */
  image_urls: string[];
  /** Adapter l'image : contain | cover | fill */
  image_fit: ImageFit;
  /** Ordre de défilement : random | sequential */
  media_order: MediaOrder;
  /** Intervalle de rafraîchissement de la liste média (secondes) */
  media_list_update_interval: number;
  /** Durée d'affichage de chaque image (secondes) */
  image_duration: number;
  /** Entité HA pour activer/désactiver depuis HA */
  screensaver_entity?: string;
  /** Styles avancés */
  style: WallPanelStyle;
  /** Gestes tactiles. Absent dans les configs antérieures — lire via `gesturesOf`. */
  gestures?: WallPanelGestures;
  /**
   * Bord où poser la grille de widgets. Défaut `top`, la seule disposition
   * possible jusqu'ici — sur une tablette en paysage, une bande de cards en
   * haut recouvre justement la partie de la photo qu'on regarde.
   */
  widgetAnchor?: WidgetAnchor;
}

export const DEFAULT_GESTURES: WallPanelGestures = {
  enabled: true,
  photos: true,
  quickPanelId: '',
  notifications: true,
  hints: true,
};

/**
 * Gestes d'une config, champs manquants comblés.
 *
 * `gestures` est optionnel pour que les configurations enregistrées avant cette
 * fonctionnalité restent valides : sans ce passage obligé, chaque lecture
 * devrait répéter le même jeu de valeurs par défaut.
 */
export function gesturesOf(config: WallPanelConfig): WallPanelGestures {
  return { ...DEFAULT_GESTURES, ...config.gestures };
}

export const DEFAULT_WALLPANEL_CONFIG: WallPanelConfig = {
  enabled: false,
  idle_time: 300,
  image_urls: [],
  image_fit: 'cover',
  media_order: 'random',
  media_list_update_interval: 43200,
  image_duration: 30,
  screensaver_entity: undefined,
  style: {
    backgroundBlur: 0,
    infoBoxOpacity: 1,
    infoBoxWidth: 380,
    containBlurBackground: false,
  },
  gestures: DEFAULT_GESTURES,
  widgetAnchor: 'top',
};

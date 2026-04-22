export type MediaOrder = 'random' | 'sequential';
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
};

export interface CoverRowBlock {
  id: string;
  type: 'cover-row';
  entityId: string;
  label?: string;
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  domain: string;
  service: string;
  targetEntityIds: string[];
}

export interface InlineButton {
  id: string;
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  domain: string;
  service: string;
  targetEntityIds: string[];
}

export interface ButtonRowBlock {
  id: string;
  type: 'button-row';
  buttons: InlineButton[];
}

export interface SectionHeaderBlock {
  id: string;
  type: 'section-header';
  title: string;
}

/**
 * Embarque n'importe quelle card du registre dans un panneau.
 *
 * Les quatre autres blocs *agissent* sans rien *afficher* : pas d'etat, pas
 * d'image, pas de courbe. Ecrire un bloc dedie par besoin, c'etait redevelopper
 * des cards qui existent deja. Celui-ci les reutilise toutes, avec leur edition,
 * leurs dispositions et leur i18n.
 */
export interface WidgetBlock {
  id: string;
  type: 'widget';
  /** Cle de `WIDGET_COMPONENTS` : 'camera', 'vacuum', 'light'... */
  widgetType: string;
  /**
   * Config de la card, **en ligne dans le bloc**.
   *
   * Pas dans `widgetConfigs[page]` : un panneau est global, les configs de
   * widgets sont par page. Les y stocker rendrait un panneau dependant de la
   * page depuis laquelle on l'ouvre.
   */
  config: Record<string, unknown>;
  /** Hauteur en rangees de grille (80 px). Defaut 4. */
  rows?: number;
}

export type CustomBlock = CoverRowBlock | ButtonBlock | ButtonRowBlock | SectionHeaderBlock | WidgetBlock;

export interface CustomPanel {
  id: string;
  name: string;
  icon?: string;
  /** Pastille de la modale épinglée dans le rail, `#rrggbb`. Absente : le violet des modales. */
  color?: string;
  blocks: CustomBlock[];
  /**
   * Boutons posés dans l'en-tête de la feuille, à côté de la fermeture.
   *
   * Ce qu'un bloc `button-row` ne fait pas : rester visible quand la liste
   * défile, et ne pas coûter une rangée de contenu. Pour l'action qui va avec
   * le panneau — tout éteindre, lancer une scène — plutôt que dans le panneau.
   */
  headerButtons?: InlineButton[];
  /**
   * Pastille d'état dans le menu de gauche, comme le « 68° » de l'Echo Show :
   * une température s'affiche à la place de l'icône, un appareil allumé
   * allume l'icône. Absente : l'icône seule.
   */
  railEntity?: string;
  /**
   * Nombre de colonnes de la grille au plus large : chaque bloc en prend une.
   * Absent : autant de colonnes de 220 px que la largeur en tient, une card
   * en occupant deux.
   */
  columns?: number;
}

/** Barre du bas : panneaux épinglés, dans l'ordre, et libellés sous les icônes. */
export interface DockConfig {
  panels: string[];
  labels: boolean;
}

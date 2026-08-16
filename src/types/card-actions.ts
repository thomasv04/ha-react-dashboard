/**
 * Actions déclenchées par un geste sur une card.
 *
 * Reprend le vocabulaire de Home Assistant (`tap_action`, `hold_action`,
 * `double_tap_action`) délibérément : c'est ce que les utilisateurs connaissent
 * déjà de Lovelace, et ce que documentent tous les tutoriels existants.
 *
 * Ces trois champs sont **communs à toutes les cards**, pas propres à un type
 * de widget : ils sont lus par `GridItem`, un seul point de passage, plutôt que
 * réimplémentés dans chacun des trente composants.
 */

/** Ce que fait un geste. `none` sert à *désactiver* un comportement par défaut. */
export type CardActionType = 'default' | 'more-info' | 'navigate' | 'call-service' | 'url' | 'none';

export interface CardAction {
  action: CardActionType;
  /** `navigate` : id de page (`home`) ou de panneau (`custom:<id>`). */
  target?: string;
  /** `call-service` : `light.turn_on`. */
  service?: string;
  /** `call-service` : entité ciblée. Vide = l'entité de la card. */
  entityId?: string;
  /** `call-service` : données de service, en JSON. */
  serviceData?: string;
  /** `url` : adresse ouverte dans un nouvel onglet. */
  url?: string;
}

/** Champs d'action que n'importe quelle config de widget peut porter. */
export interface CardActionsConfig {
  tapAction?: CardAction;
  holdAction?: CardAction;
  doubleTapAction?: CardAction;
}

/**
 * `default` = le comportement historique du widget (ouvrir la fiche « more
 * info » quand il en a une). C'est la valeur implicite : sans elle, ajouter ces
 * champs aurait changé le comportement de toutes les cards déjà en place.
 */
export const DEFAULT_ACTION: CardAction = { action: 'default' };

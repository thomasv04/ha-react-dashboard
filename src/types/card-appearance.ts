/** Réglages d'apparence communs à toutes les cards. */
export interface CardAppearanceConfig {
  /**
   * Sans fond gris : la card repose directement sur le panneau, comme la date
   * de l'Echo Show. Posé sur la tuile, il neutralise `--ds-surface-2`, le fond
   * que les cards se partagent — aucune n'a besoin de le connaître.
   */
  noBackground?: boolean;
  /** Sans titre : la card ne montre plus son nom, la place revient au contenu. */
  hideTitle?: boolean;
}

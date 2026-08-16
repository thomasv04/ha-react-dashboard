import DOMPurify from 'dompurify';

export type RichTextType = 'plain' | 'html' | 'markdown';

/**
 * Texte venu d'un événement Home Assistant.
 *
 * Ce contenu peut être émis par n'importe quelle automatisation, et provient
 * souvent d'une source externe (flux, notification, capteur) : l'injecter tel
 * quel serait une XSS sur l'origine du dashboard. L'assainissement vit **ici**,
 * en un seul endroit, pour que chaque nouvel afficheur en hérite au lieu de le
 * réimplémenter — ou de l'oublier.
 */
export function RichText({ type = 'plain', value, className }: { type?: RichTextType; value: string; className?: string }) {
  if (type === 'html') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
  }
  // Pas de moteur markdown embarqué : rendu tel quel, en respectant les retours
  // à la ligne. Afficher un avertissement de développeur à l'utilisateur final
  // n'aiderait personne.
  return <p className={className}>{value}</p>;
}

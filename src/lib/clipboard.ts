/**
 * Copie `text` dans le presse-papiers ; \`false\` si le navigateur refuse.
 *
 * `navigator.clipboard` n'existe qu'en contexte sécurisé (HTTPS ou localhost).
 * Or une tablette murale ouvre très souvent Home Assistant en
 * `http://homeassistant.local:8123` : l'objet y est `undefined`, et chaque bouton
 * « Copier » levait une erreur ou, pire, échouait sans un mot. Le repli passe par
 * un champ de saisie sélectionné et `execCommand('copy')`, que tous les
 * navigateurs acceptent sur un geste de l'utilisateur, en HTTP compris.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refusé (permission, page sans focus) : on tente le repli.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  // Hors écran mais pas `display:none` : un champ masqué ne se sélectionne pas.
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const previous = document.activeElement as HTMLElement | null;
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    previous?.focus?.();
  }
}

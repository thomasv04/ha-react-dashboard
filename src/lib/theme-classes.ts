/**
 * Recopie l'état du thème de `<html>` sur un élément.
 *
 * `ThemeContext` pose ses classes (`theme-*`, `perf-*`) et `data-theme` sur
 * `<html>`. En mode carte Home Assistant, le dashboard vit dans une shadow root
 * avec sa propre copie de la feuille de style : un sélecteur comme
 * `.theme-sea-glass .gc` n'y voit pas `<html>`, qui est hors de l'arbre. Seules
 * les variables CSS, héritées, traversent la frontière. On recopie donc ces
 * classes sur le conteneur de l'app, à l'intérieur de la shadow root.
 *
 * Renvoie de quoi arrêter l'observation.
 */
const THEME_CLASS = /^(theme-|perf-)/;

export function mirrorThemeClasses(target: HTMLElement): () => void {
  const html = document.documentElement;
  const sync = () => {
    for (const c of [...target.classList]) if (THEME_CLASS.test(c)) target.classList.remove(c);
    for (const c of html.classList) if (THEME_CLASS.test(c)) target.classList.add(c);
    if (html.dataset.theme) target.dataset.theme = html.dataset.theme;
    else delete target.dataset.theme;
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(html, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  return () => observer.disconnect();
}

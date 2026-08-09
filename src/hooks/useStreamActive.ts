import { useEffect, useState, type RefObject } from 'react';

/**
 * Vrai quand l'élément mérite de consommer de la bande passante : visible à
 * l'écran **et** page au premier plan.
 *
 * Un flux caméra est une connexion HTTP continue. Sans ce garde-fou il tourne
 * aussi quand la card est défilée hors champ, quand l'économiseur d'écran du
 * panneau mural est actif ou quand l'onglet passe en arrière-plan — soit
 * l'essentiel du temps, sur une tablette allumée en permanence.
 *
 * `rootMargin` généreux : on relance un peu avant que la card entre dans le
 * champ, pour qu'elle soit déjà en image quand elle arrive.
 */
export function useStreamActive(ref: RefObject<HTMLElement | null>, enabled = true): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden));

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    // `IntersectionObserver` absent (WebView ancienne) : on ne dégrade pas le
    // fonctionnement, on considère la card visible.
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const obs = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, enabled]);

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return enabled && onScreen && pageVisible;
}

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind sm

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    // Absent de jsdom (tests) : la largeur lue au montage suffit alors.
    const mq = window.matchMedia?.(`(max-width: ${breakpoint - 1}px)`);
    mq?.addEventListener('change', handler);
    return () => mq?.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

/** Téléphone : étroit, ou couché. Même requête que la variante `phone:` (index.css). */
export const PHONE_QUERY = '(max-width: 639px), (max-height: 499px)';

/**
 * Le dashboard est-il sur un téléphone ? Par la plus petite dimension et non la
 * largeur seule : couché pour le plein écran d'une caméra, un téléphone dépasse
 * 640 px de large, et l'appli ne doit pas basculer sur l'interface tablette.
 */
export function useIsPhone() {
  const [phone, setPhone] = useState(() => !!window.matchMedia?.(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY);
    if (!mq) return;
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

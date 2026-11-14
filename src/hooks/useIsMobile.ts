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

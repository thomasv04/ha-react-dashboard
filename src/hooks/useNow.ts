import { useEffect, useState } from 'react';

/**
 * Horloge du navigateur, recalée sur la frontière de seconde ou de minute.
 *
 * Un `setInterval` posé au montage dérive : il change d'heure à un instant
 * arbitraire hérité du moment où le composant est apparu. On vise la prochaine
 * frontière, ce qui évite aussi de re-rendre chaque seconde une horloge qui
 * n'affiche que les minutes.
 */
export function useNow(withSeconds = false): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const period = withSeconds ? 1_000 : 60_000;
    const schedule = () => {
      id = setTimeout(
        () => {
          setNow(new Date());
          schedule();
        },
        period - (Date.now() % period)
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [withSeconds]);

  return now;
}

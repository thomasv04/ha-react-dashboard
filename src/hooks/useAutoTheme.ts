import { useEffect, useMemo } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { useTheme } from '@/context/ThemeContext';

/**
 * ~50 lux : la frontière habituelle entre un intérieur éclairé le jour et une
 * pièce à l'éclairage artificiel du soir.
 */
export const DEFAULT_ILLUMINANCE_THRESHOLD = 50;

/**
 * Bascule jour/nuit automatique.
 *
 * Deux sources possibles :
 *
 * - **le soleil** (`sun.sun`), simple et sans matériel — mais il ignore un ciel
 *   couvert, des volets fermés, une pièce sans fenêtre ;
 * - **un capteur de luminosité**, qui reflète la lumière réellement présente.
 *   C'est le réglage qui convient à une tablette murale dans un couloir.
 *
 * Le capteur, quand il est renseigné, l'emporte sur le soleil : c'est un choix
 * explicite de l'utilisateur, plus précis que l'astronomie.
 */
export function useAutoTheme() {
  const { autoTheme, setTheme, themeId } = useTheme();

  // Deux entités au plus, jamais tout le store : `useHass()` sans sélecteur
  // rendait ce pont à chaque changement d'état de la maison.
  const watched = useMemo(() => (autoTheme.illuminanceEntity ? [autoTheme.illuminanceEntity] : ['sun.sun']), [autoTheme.illuminanceEntity]);
  const entities = useEntities(watched);

  useEffect(() => {
    if (!autoTheme.enabled) return;

    const read = (id: string) => entities[id]?.state;

    let isDay: boolean;

    if (autoTheme.illuminanceEntity) {
      const lux = Number(read(autoTheme.illuminanceEntity));
      // Une entité absente, indisponible ou non numérique ne dit rien : on ne
      // bascule pas plutôt que de choisir au hasard un thème qui changerait
      // l'écran sous les yeux de l'utilisateur.
      if (!Number.isFinite(lux)) return;
      isDay = lux >= (autoTheme.illuminanceThreshold ?? DEFAULT_ILLUMINANCE_THRESHOLD);
    } else {
      const sun = read('sun.sun');
      if (!sun) return;
      isDay = sun === 'above_horizon';
    }

    const targetTheme = isDay ? autoTheme.lightTheme : autoTheme.darkTheme;
    if (themeId !== targetTheme) setTheme(targetTheme);
  }, [autoTheme, entities, themeId, setTheme]);
}

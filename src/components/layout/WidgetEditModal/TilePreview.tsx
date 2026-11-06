import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GRID_GAP, GRID_ROW, colsWidth } from '@/lib/panel-grid';

/** Hauteur maximale de l'aperçu, en px : au-delà, la tuile est réduite. */
const MAX_HEIGHT = 210;

/**
 * La card dans sa vraie case, réduite pour tenir dans l'aperçu.
 *
 * Une card se dimensionne sur sa case (`h-full`, requêtes de conteneur) : posée
 * dans une boîte sans hauteur, la zone de son cadran s'écrasait et les flèches
 * chevauchaient le titre. On la rend donc à la taille exacte qu'elle aura sur le
 * plateau — `w` colonnes sur `h` rangées —, puis on met le tout à l'échelle.
 * Elle suit aussi la taille choisie dans l'onglet Mise en page.
 */
export function TilePreview({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tileW = colsWidth(w);
  const tileH = h * GRID_ROW + (h - 1) * GRID_GAP;
  // Pas d'agrandissement : une petite tuile reste à sa taille réelle.
  const scale = available > 0 ? Math.min(1, available / tileW, MAX_HEIGHT / tileH) : 0;

  return (
    <div ref={slot} data-testid='tile-preview' className='flex justify-center'>
      <div className='relative shrink-0 overflow-hidden' style={{ width: tileW * scale, height: tileH * scale }}>
        {scale > 0 && (
          <div style={{ width: tileW, height: tileH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
        )}
      </div>
    </div>
  );
}

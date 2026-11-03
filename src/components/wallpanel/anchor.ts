import type { CSSProperties } from 'react';
import { widgetExtentOf, type WallPanelConfig, type WidgetAnchor } from '@/types/wallpanel';

/** Où la grille se pose sur l'overlay. La largeur vient de `widgetExtentOf`. */
const ANCHOR_CLASS: Record<WidgetAnchor, string> = {
  top: 'absolute top-0 left-1/2 -translate-x-1/2 px-5 pt-8',
  bottom: 'absolute bottom-0 left-1/2 -translate-x-1/2 px-5 pb-8',
  left: 'absolute inset-y-0 left-0 px-5 py-8 overflow-y-auto',
  right: 'absolute inset-y-0 right-0 px-5 py-8 overflow-y-auto',
};

/** Classe et largeur de la zone des widgets, pour une configuration donnée. */
export function anchorStyle(config: WallPanelConfig): { className: string; style: CSSProperties } {
  const anchor = config.widgetAnchor ?? 'top';
  const extent = widgetExtentOf(config);
  return {
    className: ANCHOR_CLASS[anchor],
    // `maxWidth` seulement en haut et en bas : sur un côté, la bande *est* la
    // part demandée, la borner à 1440 px n'aurait aucun sens sur un écran étroit.
    style: anchor === 'left' || anchor === 'right' ? { width: `${extent}%` } : { width: `${extent}%`, maxWidth: 1440 },
  };
}

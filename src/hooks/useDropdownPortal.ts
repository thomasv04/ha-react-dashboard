import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Un menu déroulant rendu dans `document.body`, posé sous son déclencheur.
 *
 * Le portail est nécessaire : ces menus vivent dans des modales et des panneaux
 * qui rognent leur contenu (`overflow: hidden`) ou l'empilent dans un contexte
 * de superposition dont on ne peut pas sortir avec un simple `z-index`.
 *
 * Cinq champs le réimplémentaient — position, fermeture au clic extérieur,
 * `createPortal`. Deux d'entre eux recalaient en plus le menu dans la fenêtre
 * et le fermaient au défilement ; les trois autres ne le faisaient pas, tout en
 * élargissant le menu au-delà de son déclencheur. Un menu large ouvert près du
 * bord droit débordait donc, et un menu en `position: fixed` se décrochait de
 * son champ dès qu'on faisait défiler la modale. Ici les deux corrections
 * valent pour tout le monde.
 */
/** Hauteur des plus grands menus : en deçà sous le déclencheur, on regarde au-dessus. */
const MENU_ROOM = 320;

export function useDropdownPortal<T extends HTMLElement>({ minWidth = 0 }: { minWidth?: number } = {}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<T>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /** Ouvre le menu sous son déclencheur. Idempotent — sûr dans un effet. */
  const show = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, minWidth);
      // Une marge de 8 px des deux côtés : un menu plus large que son
      // déclencheur doit rester visible, et le recalage ne doit pas le faire
      // sortir par la gauche à son tour.
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      // Près du bas de l'écran, le menu s'ouvre vers le haut : il est en
      // `position: fixed`, rien ne défile, et ses dernières lignes restaient
      // hors d'atteinte sous le bord.
      const below = window.innerHeight - rect.bottom;
      const up = below < MENU_ROOM && rect.top > below;
      setDropPos(up ? { bottom: window.innerHeight - rect.top + 4, left, width } : { top: rect.bottom + 4, left, width });
    }
    setOpen(true);
  }, [minWidth]);

  const toggle = useCallback(() => (open ? setOpen(false) : show()), [open, show]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const isInside = (target: Node | null) =>
      (target && triggerRef.current?.contains(target)) || (target && dropRef.current?.contains(target));

    const onPointerDown = (e: MouseEvent) => {
      if (isInside(e.target as Node)) return;
      setOpen(false);
    };
    // Au défilement : la position est figée, le menu se décrocherait de son
    // champ. On ignore le défilement *dans* le menu, qui a sa propre liste.
    const onScroll = (e: Event) => {
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  /** À poser tel quel sur le `<div>` du portail. */
  const dropStyle: CSSProperties = { top: dropPos.top, bottom: dropPos.bottom, left: dropPos.left, width: dropPos.width };

  return { open, setOpen, toggle, show, close, triggerRef, dropRef, dropStyle };
}

import { useLayoutEffect, useState, useRef, type RefObject } from 'react';

export type WidgetSizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Classe de hauteur, calée sur la trame de la grille (rangée de 80 px + gouttière
 * de 16 px) — c'est ce qui rend les seuils lisibles côté card :
 *
 * - `squat`  ≈ 1 rangée  (80 px)   → une seule ligne de contenu tient
 * - `short`  ≈ 2 rangées (176 px)  → en-tête + un bloc principal
 * - `normal` ≈ 3 rangées (272 px)  → en-tête + principal + contrôles
 * - `tall`   ≥ 4 rangées (368 px)  → tout, aéré
 */
export type WidgetHeightClass = 'squat' | 'short' | 'normal' | 'tall';

export interface WidgetSize {
  /** Classe de largeur */
  w: WidgetSizeClass;
  /** Classe de hauteur */
  h: WidgetHeightClass;
  /** Trop petit pour du contenu secondaire (étroit *ou* écrasé) */
  compact: boolean;
  /** Une seule rangée : la card doit passer en disposition horizontale */
  squat: boolean;
}

function classifyWidth(w: number): WidgetSizeClass {
  if (w < 120) return 'xs';
  if (w < 200) return 'sm';
  if (w < 320) return 'md';
  if (w < 480) return 'lg';
  return 'xl';
}

function classifyHeight(h: number): WidgetHeightClass {
  if (h < 120) return 'squat';
  if (h < 220) return 'short';
  if (h < 330) return 'normal';
  return 'tall';
}

// Hysteresis in px to prevent oscillation when the widget sits on a boundary.
// A size class only changes when width crosses the threshold by this margin.
const HYSTERESIS = 10;

const ORDER: WidgetSizeClass[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const UPPER: Record<WidgetSizeClass, number> = { xs: 120, sm: 200, md: 320, lg: 480, xl: Infinity };
const LOWER: Record<WidgetSizeClass, number> = { xs: 0, sm: 120, md: 200, lg: 320, xl: 480 };

const H_ORDER: WidgetHeightClass[] = ['squat', 'short', 'normal', 'tall'];
const H_UPPER: Record<WidgetHeightClass, number> = { squat: 120, short: 220, normal: 330, tall: Infinity };
const H_LOWER: Record<WidgetHeightClass, number> = { squat: 0, short: 120, normal: 220, tall: 330 };

function withHysteresis<T extends string>(
  next: T,
  current: T,
  value: number,
  order: T[],
  upper: Record<T, number>,
  lower: Record<T, number>
): T {
  if (next === current) return current;
  const isGrowing = order.indexOf(next) > order.indexOf(current);
  if (isGrowing && value < upper[current] + HYSTERESIS) return current;
  if (!isGrowing && value > lower[current] - HYSTERESIS) return current;
  return next;
}

function build(w: WidgetSizeClass, h: WidgetHeightClass): WidgetSize {
  return {
    w,
    h,
    compact: w === 'xs' || w === 'sm' || h === 'squat',
    squat: h === 'squat',
  };
}

const DEFAULT: WidgetSize = build('md', 'normal');

/**
 * Boîte de bordure d'un élément, tenue à jour.
 *
 * On mesure via `getBoundingClientRect()` et **jamais** via
 * `entry.contentRect` :
 *
 * 1. c'est la boîte de bordure, directement comparable à la trame de la grille
 *    (une rangée = 80 px), là où `contentRect` retranche le padding et décale
 *    tous les seuils d'une carte à l'autre selon son padding ;
 * 2. c'est **synchrone** : la card connaît sa taille dès le premier rendu.
 *    Les callbacks de `ResizeObserver` sont livrés avec le cycle de rendu et
 *    ne partent pas quand la page ne compose pas (onglet en arrière-plan,
 *    écran de la tablette éteint). En s'y fiant seul, les cards restaient
 *    bloquées sur leur taille par défaut et rendaient la disposition desktop
 *    dans une rangée de 80 px. Le ResizeObserver n'est plus qu'un déclencheur.
 *
 * `onChange` est appelé à la mesure initiale puis à chaque redimensionnement.
 */
export function useElementBox(ref: RefObject<HTMLElement | null>, onChange: (width: number, height: number) => void): void {
  const cbRef = useRef(onChange);
  // Déclaré avant l'effet de mesure : les effets partent dans l'ordre de
  // déclaration, donc `cbRef` est à jour avant la toute première mesure.
  useLayoutEffect(() => {
    cbRef.current = onChange;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const { width, height } = node.getBoundingClientRect();
      if (width === 0 && height === 0) return; // détaché / display:none
      cbRef.current(width, height);
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
}

/**
 * Classe de taille d'un widget, sur les **deux** axes.
 *
 * La hauteur compte autant que la largeur : une card 360×80 est large mais ne
 * peut afficher qu'une ligne. En ne mesurant que la largeur, elle était classée
 * `lg` et rendait sa disposition desktop dans 80 px — c'est ce qui écrasait ou
 * rognait la plupart des cards sur mobile, où les rangées sont courtes.
 */
export function useWidgetSize(ref: RefObject<HTMLElement | null>): WidgetSize {
  const [size, setSize] = useState<WidgetSize>(DEFAULT);
  const sizeRef = useRef<WidgetSize>(DEFAULT);

  useElementBox(ref, (width, height) => {
    const w = withHysteresis(classifyWidth(width), sizeRef.current.w, width, ORDER, UPPER, LOWER);
    const h = withHysteresis(classifyHeight(height), sizeRef.current.h, height, H_ORDER, H_UPPER, H_LOWER);
    if (w !== sizeRef.current.w || h !== sizeRef.current.h) {
      sizeRef.current = build(w, h);
      setSize(sizeRef.current);
    }
  });

  return size;
}

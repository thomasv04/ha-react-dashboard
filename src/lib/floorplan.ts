import type { FloorplanPos } from '@/context/DashboardLayoutContext';
import { clamp } from '@/lib/utils';

/**
 * Géométrie d'une page `floorplan` — tout est en % du plan, pour que les
 * éléments restent sur la bonne pièce quelle que soit la taille de l'écran.
 */

/** Taille d'un widget posé sans taille (ajouté via « Ajouter »), en % du plan. */
export const DEFAULT_WIDGET_SIZE = { w: 24, h: 30 };

/**
 * Largeur sous laquelle le plan ne descend plus : sur un téléphone, il se fait
 * défiler plutôt que de réduire pastilles et cards à l'illisible.
 */
export const MIN_PLAN_WIDTH = 768;

/** Plus petit widget redimensionnable, en % du plan. */
const MIN_SIZE = 4;

const percent = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, 100) : fallback);

/**
 * Position affichable d'un élément.
 *
 * Une config importée ou écrite à la main peut porter n'importe quoi : un `pos`
 * illisible ramène l'élément au centre plutôt que de l'envoyer hors du plan,
 * où l'on ne pourrait plus le saisir. `sized` : un widget a une taille, une
 * pastille prend celle de son contenu.
 */
export function normalizePos(pos: unknown, sized: boolean): FloorplanPos {
  const p = (pos && typeof pos === 'object' ? pos : {}) as Record<string, unknown>;
  const x = percent(p.x, 50);
  const y = percent(p.y, 50);
  if (!sized) return { x, y };
  return {
    x,
    y,
    w: Math.max(MIN_SIZE, percent(p.w, DEFAULT_WIDGET_SIZE.w)),
    h: Math.max(MIN_SIZE, percent(p.h, DEFAULT_WIDGET_SIZE.h)),
  };
}

/**
 * Taille du plan : la plus grande qui tienne dans la zone (`object-fit:
 * contain`), sans descendre sous `minWidth` — au-delà, la zone défile.
 */
export function containSize(areaW: number, areaH: number, aspect: number, minWidth = MIN_PLAN_WIDTH): { w: number; h: number } {
  const w = Math.max(minWidth, Math.min(areaW, areaH * aspect));
  return { w, h: w / aspect };
}

type Rect = { width: number; height: number };

/**
 * Déplacement de `dx`, `dy` pixels sur un plan de taille `rect`.
 *
 * Un widget reste entier dans le plan ; une pastille peut en atteindre le bord,
 * son centre y reste.
 */
export function movePos(start: FloorplanPos, dx: number, dy: number, rect: Rect): FloorplanPos {
  const halfW = (start.w ?? 0) / 2;
  const halfH = (start.h ?? 0) / 2;
  return {
    ...start,
    x: clamp(start.x + (dx / rect.width) * 100, halfW, 100 - halfW),
    y: clamp(start.y + (dy / rect.height) * 100, halfH, 100 - halfH),
  };
}

/** Redimensionnement par le coin bas-droit : le coin haut-gauche ne bouge pas. */
export function resizePos(start: FloorplanPos, dx: number, dy: number, rect: Rect): FloorplanPos {
  const w0 = start.w ?? DEFAULT_WIDGET_SIZE.w;
  const h0 = start.h ?? DEFAULT_WIDGET_SIZE.h;
  const left = start.x - w0 / 2;
  const top = start.y - h0 / 2;
  const w = clamp(w0 + (dx / rect.width) * 100, MIN_SIZE, 100 - left);
  const h = clamp(h0 + (dy / rect.height) * 100, MIN_SIZE, 100 - top);
  return { x: left + w / 2, y: top + h / 2, w, h };
}

/** Blanc chaud : ce qu'éclaire à peu près une lampe sans couleur (variateur seul). */
const WARM_WHITE: [number, number, number] = [255, 196, 128];

/**
 * Couleur réelle d'une lampe allumée, `null` sinon.
 *
 * `rgb_color` suffit : Home Assistant le calcule aussi pour les lampes réglées
 * en température de couleur.
 */
export function lightColor(state: string | undefined, attributes: Record<string, unknown> | undefined): [number, number, number] | null {
  if (state !== 'on') return null;
  const rgb = attributes?.rgb_color;
  return Array.isArray(rgb) && rgb.length === 3 && rgb.every(n => typeof n === 'number') ? (rgb as [number, number, number]) : WARM_WHITE;
}

/**
 * Halo d'une lampe sur le plan : sa couleur, et une opacité qui suit la
 * luminosité. `null` si elle est éteinte.
 */
export function lightGlow(
  state: string | undefined,
  attributes: Record<string, unknown> | undefined
): { color: [number, number, number]; opacity: number } | null {
  const color = lightColor(state, attributes);
  if (!color) return null;
  const brightness = typeof attributes?.brightness === 'number' ? attributes.brightness : 255;
  // Plancher : une lampe allumée au minimum doit encore se voir sur le plan.
  return { color, opacity: 0.25 + 0.55 * clamp(brightness / 255, 0, 1) };
}

/** Le plan s'assombrit au coucher du soleil, sauf si la page l'a désactivé. */
export function isNightDimmed(sunState: string | undefined, dimAtNight: boolean | undefined): boolean {
  return dimAtNight !== false && sunState === 'below_horizon';
}

// ── Maquette 3D ──────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

/**
 * Diagonale de la maquette une fois chargée, quelle que soit l'unité de
 * l'export (cm pour Sketchfab ou Sweet Home 3D, m pour Blender) : caméra,
 * soleil et portée des lampes se règlent une fois pour toutes.
 */
export const MODEL_SIZE = 20;

/** Point d'accroche lisible, ou `undefined` — même prudence que `normalizePos`. */
export function normalizeAnchor(anchor: unknown): Vec3 | undefined {
  return Array.isArray(anchor) && anchor.length === 3 && anchor.every(n => typeof n === 'number' && Number.isFinite(n))
    ? (anchor as Vec3)
    : undefined;
}

/** Soleil supposé quand `sun.sun` manque : début d'après-midi, une lumière flatteuse. */
const DEFAULT_SUN = { elevation: 40, azimuth: 200 };

/**
 * Éclairage de la maquette d'après `sun.sun` (degrés : azimut depuis le nord,
 * dans le sens horaire ; élévation au-dessus de l'horizon).
 *
 * `dir` pointe vers le soleil, y vers le haut ; le nord est −z, tourné de
 * `north` degrés — l'orientation de la maquette, que rien ne donne : c'est un
 * réglage, pas une déduction. La nuit, le soleil s'éteint et l'ambiance baisse
 * progressivement autour du crépuscule : les lampes prennent le relais.
 */
export function sunLighting(sun: { elevation?: number; azimuth?: number } | undefined, north = 0) {
  const elevation = sun?.elevation ?? DEFAULT_SUN.elevation;
  const azimuth = sun?.azimuth ?? DEFAULT_SUN.azimuth;
  const e = (elevation * Math.PI) / 180;
  const a = ((azimuth + north) * Math.PI) / 180;
  return {
    dir: [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)] as Vec3,
    sun: 3 * Math.max(0, Math.sin(e)),
    // Crépuscule civil : de −6° à +10°, l'ambiance passe de la nuit au jour.
    ambient: 0.15 + 0.85 * clamp((elevation + 6) / 16, 0, 1),
  };
}

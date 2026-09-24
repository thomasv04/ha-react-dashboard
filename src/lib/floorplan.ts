import type { FloorplanPos } from '@/context/DashboardLayoutContext';
import { normalizePackState } from '@/lib/battery-state';
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
const MIN_PLAN_WIDTH = 768;

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
 * contain`), sans descendre sous `MIN_PLAN_WIDTH` — au-delà, la zone défile.
 */
export function containSize(areaW: number, areaH: number, aspect: number): { w: number; h: number } {
  const w = Math.max(MIN_PLAN_WIDTH, Math.min(areaW, areaH * aspect));
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

/** Ce qu'on dessine sur la maquette, le temps de le dessiner : ambre. */
export const DRAFT_COLOR = '#fbbf24';

/** Point d'accroche lisible, ou `undefined` — même prudence que `normalizePos`. */
export function normalizeAnchor(anchor: unknown): Vec3 | undefined {
  return Array.isArray(anchor) && anchor.length === 3 && anchor.every(n => typeof n === 'number' && Number.isFinite(n))
    ? (anchor as Vec3)
    : undefined;
}

// ── Éléments animés : portes, fenêtres, volets ───────────────────────────────

export const PART_KINDS = ['door', 'window', 'shutter', 'garage'] as const;
export type PartKind = (typeof PART_KINDS)[number];

/**
 * Porte, fenêtre ou volet dessiné sur la maquette : un rectangle vertical,
 * donné par deux coins opposés, dans les coordonnées de la maquette.
 *
 * Dessiné, et non choisi dans la maquette : la plupart des exports fondent
 * portes, murs et fenêtres en un seul objet par matière.
 */
export interface FloorplanPart {
  id: string;
  kind: PartKind;
  entityId: string;
  /** Coin bas — côté gonds pour une porte ou une fenêtre. */
  a: Vec3;
  /** Coin haut opposé. */
  b: Vec3;
  /** Côté du rectangle, le long de sa normale, où la porte s'ouvre et où se tient le volet. */
  side: 1 | -1;
  /** Couleur du battant ou du tablier (`#rrggbb`), prise sur la maquette. */
  color?: string;
}

/** Éléments lisibles d'une config : un élément illisible est écarté, pas fatal. */
export function normalizeParts(parts: unknown): FloorplanPart[] {
  if (!Array.isArray(parts)) return [];
  return parts.flatMap(p => {
    const part = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const a = normalizeAnchor(part.a);
    const b = normalizeAnchor(part.b);
    if (typeof part.id !== 'string' || typeof part.entityId !== 'string' || !PART_KINDS.includes(part.kind as PartKind) || !a || !b)
      return [];
    return [
      {
        id: part.id,
        kind: part.kind as PartKind,
        entityId: part.entityId,
        a,
        b,
        side: part.side === -1 ? -1 : 1,
        ...(typeof part.color === 'string' && /^#[0-9a-f]{6}$/i.test(part.color) && { color: part.color }),
      },
    ];
  });
}

/**
 * Repère d'un élément : `u`, horizontal, le long de l'ouverture depuis le
 * premier coin ; `n` sa normale, horizontale aussi ; `angle`, la rotation
 * autour de y qui amène x sur `u` (et z sur `n`). `null` si les coins sont
 * trop proches pour former une ouverture.
 */
export function partFrame(a: Vec3, b: Vec3) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const width = Math.hypot(dx, dz);
  const height = Math.abs(b[1] - a[1]);
  if (width < 1e-3 || height < 1e-3) return null;
  const ux = dx / width;
  const uz = dz / width;
  return {
    width,
    height,
    bottom: Math.min(a[1], b[1]),
    u: [ux, 0, uz] as Vec3,
    n: [-uz, 0, ux] as Vec3,
    angle: Math.atan2(-uz, ux),
  };
}

/** Ouverture d'une porte ou d'une fenêtre, en radians : un peu moins d'un angle droit. */
export const SWING = Math.PI * 0.46;

/**
 * Ouverture d'un élément, de 0 (fermé) à 1 (ouvert) : la position d'un volet
 * quand il la donne, sinon l'état — capteur d'ouverture ou `cover` sans
 * position.
 */
export function openness(state: string | undefined, attributes: Record<string, unknown> | undefined): number {
  const position = attributes?.current_position;
  if (typeof position === 'number' && Number.isFinite(position)) return clamp(position / 100, 0, 1);
  return state === 'on' || state === 'open' || state === 'opening' ? 1 : 0;
}

/** Type d'élément deviné d'après l'entité choisie — l'utilisateur peut le changer. */
export function guessPartKind(entityId: string, deviceClass: unknown): PartKind {
  if (deviceClass === 'garage' || deviceClass === 'garage_door') return 'garage';
  if (deviceClass === 'window') return 'window';
  if (entityId.startsWith('cover.')) return deviceClass === 'door' || deviceClass === 'gate' ? 'door' : 'shutter';
  return 'door';
}

// ── Pièces ───────────────────────────────────────────────────────────────────

/** Une pièce dessinée au sol de la maquette, dans ses coordonnées. */
export interface FloorplanRoom {
  id: string;
  name: string;
  /** Hauteur du sol de la pièce. */
  y: number;
  /** Contour au sol : (x, z) de chaque sommet. */
  points: [number, number][];
}

/** Pièces lisibles d'une config : une pièce illisible est écartée, pas fatale. */
export function normalizeRooms(rooms: unknown): FloorplanRoom[] {
  if (!Array.isArray(rooms)) return [];
  return rooms.flatMap(r => {
    const room = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const points = Array.isArray(room.points)
      ? room.points.filter(
          (p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n))
        )
      : [];
    if (
      typeof room.id !== 'string' ||
      typeof room.name !== 'string' ||
      typeof room.y !== 'number' ||
      !Number.isFinite(room.y) ||
      points.length < 3
    )
      return [];
    return [{ id: room.id, name: room.name, y: room.y, points }];
  });
}

/** Ce point (x, z) est-il dans le contour ? Règle pair-impair : un contour croisé reste lisible. */
export function pointInPolygon(x: number, z: number, points: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Centre d'une pièce, pondéré par sa surface — là où poser son nom. */
export function polygonCentroid(points: [number, number][]): [number, number] {
  let area = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const cross = points[j][0] * points[i][1] - points[i][0] * points[j][1];
    area += cross;
    cx += (points[j][0] + points[i][0]) * cross;
    cz += (points[j][1] + points[i][1]) * cross;
  }
  // Contour plat (points alignés) : la moyenne des sommets.
  if (Math.abs(area) < 1e-9)
    return [points.reduce((a, p) => a + p[0], 0) / points.length, points.reduce((a, p) => a + p[1], 0) / points.length];
  return [cx / (3 * area), cz / (3 * area)];
}

/**
 * Cap du téléphone, en degrés depuis le nord dans le sens horaire : là où
 * pointe le haut de l'écran, d'après `deviceorientationabsolute`. `alpha`
 * tourne dans l'autre sens ; ni l'inclinaison ni le roulis n'y changent rien,
 * tant que le téléphone n'est pas à la verticale. Le haut de l'appareil n'est
 * celui de l'écran qu'en portrait : `screenAngle`, `screen.orientation.angle`.
 */
export function compassHeading(alpha: number | null, screenAngle = 0): number | null {
  if (alpha === null || !Number.isFinite(alpha)) return null;
  return (((360 - alpha + screenAngle) % 360) + 360) % 360;
}

/** Rotation la plus courte d'un angle à l'autre (radians), dans ]−π, π] : une caméra qui vole ne fait pas le grand tour. */
export function shortestTurn(from: number, to: number): number {
  const turn = (to - from) % (2 * Math.PI);
  return turn > Math.PI ? turn - 2 * Math.PI : turn <= -Math.PI ? turn + 2 * Math.PI : turn;
}

/** Classes de détecteurs dont l'état « on » signale quelqu'un. */
const PRESENCE = new Set(['motion', 'occupancy', 'presence']);

/** Un détecteur de mouvement ou de présence déclenché : quelqu'un est là. */
export function isPresence(state: string | undefined, attributes: Record<string, unknown> | undefined): boolean {
  return state === 'on' && PRESENCE.has(attributes?.device_class as string);
}

/**
 * Température d'une entité, si c'en est une (classe `temperature`, ou en °C ou
 * °F) : sa valeur telle qu'affichée, et en degrés Celsius pour la colorer.
 */
export function temperatureOf(
  state: string | undefined,
  attributes: Record<string, unknown> | undefined
): { value: number; celsius: number } | null {
  const unit = attributes?.unit_of_measurement;
  if (attributes?.device_class !== 'temperature' && unit !== '°C' && unit !== '°F') return null;
  const value = parseFloat(state ?? '');
  if (!Number.isFinite(value)) return null;
  return { value, celsius: unit === '°F' ? ((value - 32) * 5) / 9 : value };
}

// ── Murs en coupe ────────────────────────────────────────────────────────────

/** Hauteur de coupe, en part de la hauteur de la maquette : des murets, juste au-dessus des plans de travail. */
export const CUTAWAY_HEIGHT = 0.38;

/** Une valeur par côté de l'emprise : x−, z−, x+, z+. */
export type Sides<T> = [T, T, T, T];

/**
 * Murs en coupe, façon Les Sims : au-dessus de `height`, seuls les murs du
 * fond restent debout. Faute de savoir où sont les murs dans une maquette
 * quelconque, « le fond » est une bande le long des côtés de l'emprise
 * tournés dos à la caméra — les murs extérieurs qu'on voit de l'intérieur.
 *
 * Les hauteurs sont celles de l'instant : un mur qui monte ou descend glisse
 * de l'une à l'autre.
 */
export interface Cutaway {
  /** Hauteur des murs abaissés. Au-dessus du haut de la maquette : rien n'est coupé. */
  height: number;
  /** Emprise de la maquette : x−, z−, x+, z+. */
  box: Sides<number>;
  /** Hauteur de chaque côté de l'emprise (x−, z−, x+, z+) : celle d'un mur du fond debout, ou `height`. */
  sides: Sides<number>;
  /** Épaisseur de la bande gardée le long d'un côté du fond : le mur, ses fenêtres. */
  margin: number;
}

/**
 * Côtés de l'emprise tournés dos à la caméra, dont les murs restent debout.
 * Un côté vu presque de profil est coupé : on regarde alors le long de lui.
 * `previous` : les côtés de l'instant d'avant — autour du seuil, un côté ne
 * bascule qu'après l'avoir franchi franchement, sans quoi un mur monterait
 * et descendrait sans fin sous une caméra qui tourne lentement.
 * Caméra à la verticale : aucun mur ne cache rien, tous restent.
 */
export function backSides(camera: Vec3, target: Vec3, previous?: Sides<boolean>): Sides<boolean> {
  const dx = camera[0] - target[0];
  const dz = camera[2] - target[2];
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return [true, true, true, true];
  // Tournés dos à la caméra, dans l'ordre x−, z−, x+, z+.
  const facing = [dx / length, dz / length, -dx / length, -dz / length];
  return facing.map((f, i) => f > (previous?.[i] ? 0.12 : 0.28)) as Sides<boolean>;
}

/** Hauteur au-dessus de laquelle la maquette n'est pas dessinée en ce point. */
export function cutLimit(p: Vec3, c: Cutaway): number {
  const [x0, z0, x1, z1] = c.box;
  let limit = c.height;
  if (p[0] < x0 + c.margin) limit = Math.max(limit, c.sides[0]);
  if (p[2] < z0 + c.margin) limit = Math.max(limit, c.sides[1]);
  if (p[0] > x1 - c.margin) limit = Math.max(limit, c.sides[2]);
  if (p[2] > z1 - c.margin) limit = Math.max(limit, c.sides[3]);
  return limit;
}

/** Ce point, dans la scène, est-il retiré par la coupe ? */
export function isCutAway(p: Vec3, c: Cutaway): boolean {
  return p[1] > cutLimit(p, c);
}

// ── Ciel ─────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

/**
 * Le ciel au fil de l'élévation du soleil (`at`, en degrés) : couleur du haut, de
 * l'horizon, et présence des étoiles. Entre deux repères, on interpole.
 */
const SKY: { at: number; top: Rgb; horizon: Rgb; stars: number }[] = [
  { at: -12, top: [7, 11, 26], horizon: [18, 26, 51], stars: 1 }, // nuit
  { at: -6, top: [14, 22, 51], horizon: [62, 44, 78], stars: 0.7 }, // crépuscule, violet
  { at: -1, top: [34, 48, 92], horizon: [214, 120, 86], stars: 0.15 }, // soleil couchant
  { at: 5, top: [60, 100, 165], horizon: [242, 178, 122], stars: 0 }, // heure dorée
  { at: 15, top: [52, 120, 210], horizon: [168, 206, 240], stars: 0 }, // jour
  { at: 50, top: [42, 112, 214], horizon: [190, 222, 250], stars: 0 }, // plein jour
];

const hex = (c: Rgb) =>
  `#${c
    .map(v =>
      Math.round(clamp(v, 0, 255))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Le gris de même luminosité : un ciel couvert. */
const overcast = (c: Rgb): Rgb => {
  const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  return [l, l, l * 1.04];
};

/** Entre deux repères encadrant `x`, la part parcourue — pour interpoler. */
function between<T extends { at: number }>(keys: T[], x: number): [T, T, number] {
  const v = clamp(x, keys[0].at, keys[keys.length - 1].at);
  const i = Math.max(0, keys.findIndex(k => k.at >= v) - 1);
  const [from, to] = [keys[i], keys[i + 1] ?? keys[i]];
  return [from, to, to.at === from.at ? 0 : (v - from.at) / (to.at - from.at)];
}

/**
 * Couleurs du ciel derrière la maquette, d'après l'élévation du soleil
 * (`sun.sun` ; absente, celle d'un début d'après-midi). Par temps couvert, il
 * grisaille et les étoiles se cachent.
 */
export function skyColors(elevation: number | undefined, clouds = 0): { top: string; horizon: string; stars: number } {
  const [from, to, t] = between(SKY, elevation ?? DEFAULT_SUN.elevation);
  const veil = (c: Rgb) => hex(mix(c, overcast(c), 0.75 * clouds));
  return {
    top: veil(mix(from.top, to.top, t)),
    horizon: veil(mix(from.horizon, to.horizon, t)),
    stars: (from.stars + (to.stars - from.stars) * t) * (1 - clouds),
  };
}

// ── Météo ────────────────────────────────────────────────────────────────────

/** Couverture nuageuse par état d'une entité `weather`, de 0 (ciel clair) à 1 (bouché). */
const CLOUDS: Record<string, number> = {
  sunny: 0,
  'clear-night': 0,
  windy: 0.15,
  partlycloudy: 0.35,
  'partly-cloudy': 0.35, // l'orthographe du mock, et de quelques intégrations
  'windy-variant': 0.4,
  exceptional: 0.5,
  cloudy: 0.75,
  rainy: 0.8,
  snowy: 0.8,
  'snowy-rainy': 0.8,
  hail: 0.8,
  lightning: 0.85,
  'lightning-rainy': 0.85,
  fog: 0.9,
  pouring: 0.9,
};

/** Couverture nuageuse d'après l'état d'une entité `weather` — inconnue : ciel clair. */
export function cloudiness(state: string | undefined): number {
  return CLOUDS[state ?? ''] ?? 0;
}

/** Ce qui tombe du ciel, de 0 à 1 par sorte, et les éclairs d'un orage. */
export interface Precipitation {
  rain: number;
  hail: number;
  snow: number;
  lightning: boolean;
}

/** Par état d'une entité `weather` ; ce qui n'y est pas ne tombe pas. */
const PRECIPITATION: Record<string, Partial<Precipitation>> = {
  rainy: { rain: 0.6 },
  pouring: { rain: 1 },
  hail: { hail: 1, rain: 0.3 },
  lightning: { lightning: true },
  'lightning-rainy': { rain: 0.8, lightning: true },
  snowy: { snow: 0.8 },
  'snowy-rainy': { rain: 0.4, snow: 0.5 },
};

/** Pluie, grêle, neige et éclairs d'après l'état d'une entité `weather` — par défaut, rien. */
export function precipitation(state: string | undefined): Precipitation {
  return { rain: 0, hail: 0, snow: 0, lightning: false, ...PRECIPITATION[state ?? ''] };
}

/**
 * Le givre sur la maquette, de 0 à 1, d'après la température de l'entité
 * `weather`, dans son unité : il paraît sous 1 °C, et couvre tout ce qu'il
 * peut à −5 °C.
 */
export function frostOf(attributes: Record<string, unknown> | undefined): number {
  const value = attributes?.temperature;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const celsius = attributes?.temperature_unit === '°F' ? ((value - 32) * 5) / 9 : value;
  return clamp((1 - celsius) / 6, 0, 1);
}

/** Couleur d'une pièce selon sa température (°C) : du bleu froid au rouge chaud. */
const THERMAL: { at: number; color: Rgb }[] = [
  { at: 16, color: [59, 130, 246] },
  { at: 18, color: [34, 211, 238] },
  { at: 20, color: [74, 222, 128] },
  { at: 22, color: [250, 204, 21] },
  { at: 24, color: [251, 146, 60] },
  { at: 26, color: [239, 68, 68] },
];

/** Couleur de la vue thermique pour une température, en degrés Celsius. */
export function thermalColor(celsius: number): string {
  const [from, to, t] = between(THERMAL, celsius);
  return hex(mix(from.color, to.color, t));
}

/** Couleur du soleil selon sa hauteur : orangé à l'horizon, doré, puis blanc chaud. */
const SUN_COLORS: { at: number; color: Rgb }[] = [
  { at: 0, color: [255, 120, 60] },
  { at: 4, color: [255, 160, 90] },
  { at: 10, color: [255, 205, 150] },
  { at: 25, color: [255, 241, 220] },
];

// ── Rejouer la journée ───────────────────────────────────────────────────────

/**
 * Un changement d'état dans l'historique de HA (`history/history_during_period`,
 * format compressé) : l'état, les attributs quand ils ont changé, l'instant en
 * secondes.
 */
export interface HistoryEntry {
  s: string;
  a?: Record<string, unknown>;
  lu?: number;
  lc?: number;
}

/**
 * État d'une entité à l'instant `time` (ms), d'après son historique : le
 * dernier changement survenu d'ici là. HA ne répète les attributs que quand
 * ils changent : on garde les derniers vus. Avant le premier changement
 * connu, le premier état — celui du début de la période.
 */
export function stateAt(
  entries: HistoryEntry[] | undefined,
  time: number
): { state: string; attributes: Record<string, unknown> } | undefined {
  if (!entries?.length) return undefined;
  let state = entries[0].s;
  let attributes = entries[0].a ?? {};
  for (const entry of entries) {
    if ((entry.lu ?? entry.lc ?? 0) * 1000 > time) break;
    state = entry.s;
    if (entry.a) attributes = entry.a;
  }
  return { state, attributes };
}

const RAD = Math.PI / 180;
/** Inclinaison de l'axe de la Terre sur son orbite. */
const OBLIQUITY = 23.4397 * RAD;

/**
 * Position du soleil vue d'un lieu, à un instant quelconque : élévation
 * au-dessus de l'horizon et azimut depuis le nord, dans le sens horaire, en
 * degrés — comme `sun.sun`. Algorithme de SunCalc (V. Agafonkin, d'après les
 * formules de J. Meeus), à deux dixièmes de degré près. Sans la réfraction de
 * l'atmosphère, que HA ajoute : un quart de degré au ras de l'horizon.
 */
export function sunPosition(date: Date, latitude: number, longitude: number): { elevation: number; azimuth: number } {
  // Jours depuis le 1er janvier 2000 à midi (J2000).
  const days = date.getTime() / 86_400_000 - 10_957.5;
  const anomaly = RAD * (357.5291 + 0.98560028 * days);
  const center = RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
  const ecliptic = anomaly + center + RAD * 102.9372 + Math.PI;
  const declination = Math.asin(Math.sin(OBLIQUITY) * Math.sin(ecliptic));
  const ascension = Math.atan2(Math.sin(ecliptic) * Math.cos(OBLIQUITY), Math.cos(ecliptic));
  const hour = RAD * (280.16 + 360.9856235 * days) + RAD * longitude - ascension;
  const phi = RAD * latitude;
  const elevation = Math.asin(Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hour));
  // Mesuré depuis le sud, vers l'ouest : on le ramène au nord.
  const azimuth = Math.atan2(Math.sin(hour), Math.cos(hour) * Math.sin(phi) - Math.tan(declination) * Math.cos(phi));
  return { elevation: elevation / RAD, azimuth: (azimuth / RAD + 540) % 360 };
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
export function sunLighting(sun: { elevation?: number; azimuth?: number } | undefined, north = 0, clouds = 0) {
  const elevation = sun?.elevation ?? DEFAULT_SUN.elevation;
  const azimuth = sun?.azimuth ?? DEFAULT_SUN.azimuth;
  const e = (elevation * Math.PI) / 180;
  const a = ((azimuth + north) * Math.PI) / 180;
  const [from, to, t] = between(SUN_COLORS, elevation);
  return {
    dir: [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)] as Vec3,
    // Pleine force dès 8° : l'éclairement d'une surface suit déjà l'angle du
    // soleil, et l'atmosphère ne l'affaiblit vraiment qu'au ras de l'horizon —
    // un soleil rasant dore les murs. Sous les nuages, il se voile…
    sun: 3 * clamp((elevation + 1) / 9, 0, 1) * (1 - 0.75 * clouds),
    // Crépuscule civil : de −6° à +10°, l'ambiance passe de la nuit au jour —
    // un peu plus diffuse par temps couvert.
    ambient: (0.15 + 0.85 * clamp((elevation + 6) / 16, 0, 1)) * (1 + 0.2 * clouds),
    // …perd sa couleur…
    color: mix(mix(from.color, to.color, t), [235, 238, 245], 0.8 * clouds).map(Math.round) as Rgb,
    // …et ses ombres s'adoucissent et pâlissent.
    softness: 1 + 7 * clouds,
    shadow: 1 - 0.55 * clouds,
  };
}

// ── Énergie ──────────────────────────────────────────────────────────────────

export const CABLE_KINDS = ['solar', 'grid', 'home', 'battery'] as const;
export type CableKind = (typeof CABLE_KINDS)[number];

/** Couleur de chaque sorte de câble : celles de la card « Flux d'énergie ». */
export const CABLE_COLORS: Record<CableKind, string> = { solar: '#fbbf24', grid: '#f87171', home: '#38bdf8', battery: '#34d399' };

/**
 * Câble d'énergie tracé sur la maquette : ses points, dans les coordonnées de
 * la maquette, dans le sens où va l'énergie quand la valeur de son entité est
 * positive — ou quand la batterie se charge.
 */
export interface FloorplanCable {
  id: string;
  kind: CableKind;
  entityId: string;
  points: Vec3[];
  /** L'entité suit la convention de signe inverse : le sens du flux aussi. */
  invert?: boolean;
}

/** Câbles lisibles d'une config : un câble illisible est écarté, pas fatal. */
export function normalizeCables(cables: unknown): FloorplanCable[] {
  if (!Array.isArray(cables)) return [];
  return cables.flatMap(c => {
    const cable = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const points = Array.isArray(cable.points) ? cable.points.map(normalizeAnchor) : [];
    if (
      typeof cable.id !== 'string' ||
      typeof cable.entityId !== 'string' ||
      !CABLE_KINDS.includes(cable.kind as CableKind) ||
      points.length < 2 ||
      points.some(p => !p)
    )
      return [];
    return [
      {
        id: cable.id,
        kind: cable.kind as CableKind,
        entityId: cable.entityId,
        points: points as Vec3[],
        ...(cable.invert === true && { invert: true }),
      },
    ];
  });
}

/**
 * Sorte d'un câble, devinée d'après le nom de son entité. Réseau, batterie et
 * maison d'abord : chez Zendure, « solarflow » désigne la batterie tout
 * entière, pas ses panneaux.
 */
export function guessCableKind(entityId: string): CableKind {
  const id = entityId.toLowerCase();
  if (/grid|reseau|réseau/.test(id)) return 'grid';
  if (/batter|pack/.test(id)) return 'battery';
  if (/home|maison|house/.test(id)) return 'home';
  if (/solar|solaire|panneau|pv/.test(id)) return 'solar';
  return 'home';
}

/** En deçà (W), rien ne circule : le bruit d'un capteur au repos. */
const FLOW_THRESHOLD = 5;

/**
 * Ce qui circule dans un câble, d'après son entité : une puissance (W ou kW),
 * dont le signe donne le sens ; sinon l'état d'une batterie — en charge,
 * l'énergie suit le tracé. `direction` 0 : rien ne circule ; `watts` nul :
 * pas de puissance connue.
 */
export function cableFlow(
  state: string | undefined,
  attributes: Record<string, unknown> | undefined,
  invert = false
): { direction: -1 | 0 | 1; watts: number | null } {
  const sign = invert ? -1 : 1;
  const unit = attributes?.unit_of_measurement;
  if (unit === 'W' || unit === 'kW' || attributes?.device_class === 'power') {
    const value = parseFloat(state ?? '');
    if (!Number.isFinite(value)) return { direction: 0, watts: null };
    const watts = value * (unit === 'kW' ? 1000 : 1) * sign;
    return { direction: Math.abs(watts) <= FLOW_THRESHOLD ? 0 : watts > 0 ? 1 : -1, watts };
  }
  // Libellé ou code numérique (1 en charge, 2 en décharge) : la même lecture que la card.
  const pack = normalizePackState(state ?? '');
  const direction = pack === 'charging' ? sign : pack === 'discharging' ? -sign : 0;
  return { direction: direction as -1 | 0 | 1, watts: null };
}

/**
 * Durée, en secondes, d'une période des traits lumineux d'un câble : d'autant
 * plus courte que la puissance est forte — trois fois plus vite passé le
 * kilowatt que pour quelques watts.
 */
export function flowDuration(watts: number | null): number {
  if (watts === null) return 0.9;
  return clamp(1.8 - 0.45 * Math.log10(Math.max(Math.abs(watts), 1)), 0.45, 1.35);
}

/** Le point à mi-longueur d'une ligne brisée — un câble : là où s'écrit sa puissance. */
export function polylineMidpoint(points: Vec3[]): Vec3 {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]));
  let rest = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0 && rest <= lengths[i]) {
      const t = rest / lengths[i];
      return points[i].map((v, k) => v + (points[i + 1][k] - v) * t) as Vec3;
    }
    rest -= lengths[i];
  }
  return points[points.length - 1];
}

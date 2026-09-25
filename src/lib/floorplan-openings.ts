import { SWING, type Vec3 } from '@/lib/floorplan';
import { friendlyName } from '@/lib/ha-service';

/**
 * Les ouvertures d'une maquette exportée de Sweet Home 3D avec le plugin
 * ExportToHASS : chaque porte, chaque fenêtre y est faite d'objets séparés —
 * cadre, battant, vitre, poignée, charnières —, dont on retrouve ici les
 * parties mobiles et la façon dont elles bougent.
 *
 * Ce que donne l'export : des nœuds à plat, un maillage chacun, en
 * centimètres. `<Nom>_<composant>`, puis `<Nom>_<composant>_<k>` quand le nom
 * revient — `k` compte ses reprises dans tout le fichier —, précédé de
 * `lvl<nnn>` sur une maison à plusieurs niveaux. Un nom hors de
 * `[A-Za-z0-9_]` est abandonné : il ne reste que le numéro du composant
 * (`1`, `6_3`), qui ne dit plus à quel objet il appartient. Murs
 * `wall_<n>_<face>`, sols `room_<n>_<face>`.
 *
 * Tout est calculé dans les coordonnées de la maquette : rien ici ne dépend
 * de la scène, de son échelle ou de sa caméra.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export const OPENING_KINDS = ['door', 'sliding', 'window', 'shutter', 'garage'] as const;
export type OpeningKind = (typeof OPENING_KINDS)[number];

/** Un nœud de la maquette, tel que le lit le chargement. */
export interface ModelNode {
  name: string;
  /** Boîte englobante. */
  min: Vec3;
  max: Vec3;
  /** Ses sommets au sol (x, z), sans doublons : l'axe d'une pièce, fût-elle posée de biais. */
  footprint: [number, number][];
}

/** Ce que dit le nom d'un nœud ExportToHASS. */
export interface NodeName {
  /** `lvl001` sur une maison à plusieurs niveaux, sinon vide. */
  level: string;
  /** Le nom de l'objet dans Sweet Home 3D ; vide s'il n'en avait pas de valide. */
  family: string;
  component: number;
  /** Reprise du même nom dans le fichier : 0 la première fois. */
  k: number;
}

/** Une ouverture trouvée dans la maquette : les nœuds d'un même objet. */
export interface DetectedOpening {
  /** Le nœud de son premier composant : c'est par lui qu'elle est désignée. */
  id: string;
  /** Vide : un objet sans nom valide. */
  family: string;
  /** Rang parmi les objets de sa famille, dans l'ordre du fichier, à partir de 1. */
  index: number;
  nodes: string[];
  min: Vec3;
  max: Vec3;
  /** Largeur et hauteur, en centimètres. */
  size: [number, number];
  /** Logée dans un mur : une ouverture, sans doute — un meuble se pose contre. */
  inWall: boolean;
  /** L'axe de son mur au sol (x, z), et l'étendue de sa plus large pièce le long de lui et au travers. */
  axis: [number, number];
  along: [number, number];
  across: [number, number];
}

/** Une famille d'objets de la maquette : les objets d'un même nom. */
export interface OpeningFamily {
  name: string;
  count: number;
  /** Un de ses objets au moins est logé dans un mur. */
  inWall: boolean;
  /** Type deviné d'après le nom — `null` : rien n'y ressemble. */
  kind: OpeningKind | null;
  /** Largeur et hauteur de son premier objet, en centimètres. */
  size: [number, number];
}

export interface ModelOpenings {
  /** Tous les objets de la maquette hors murs et sols, sans nom valide compris. */
  openings: DetectedOpening[];
  /** Les familles nommées, dans l'ordre du fichier. */
  families: OpeningFamily[];
  /** Objets sans nom valide logés dans un mur : des ouvertures qu'il faudrait renommer. */
  unnamed: number;
  /** Un centimètre, dans l'unité de la maquette. */
  cm: number;
  /** Centre de la maquette au sol (x, z) : l'intérieur, pour une porte qui ne dit pas de quel côté elle s'ouvre. */
  center: [number, number];
  /** Ses niveaux, du plus bas au plus haut — aucun de plain-pied. */
  levels: ModelLevel[];
}

/** Mouvement d'une partie mobile, depuis la pose où la maquette la dessine. */
export type Motion =
  /** Rotation autour d'un axe vertical passant par `pivot` (x, z), en radians (`rotation.y` de three.js). */
  | { type: 'swing'; pivot: [number, number]; closed: number; open: number }
  /** Glissement le long de `axis` (x, z, unitaire), dans l'unité de la maquette. */
  | { type: 'slide'; axis: [number, number]; closed: number; open: number }
  /** Enroulement vers le haut : échelle verticale autour de la hauteur `top`, 1 dans la pose modélisée. */
  | { type: 'roll'; top: number; closed: number; open: number };

/** Une partie mobile : le panneau et ce qui y tient — vitre, poignée —, et son mouvement. */
export interface MovingPart {
  nodes: string[];
  motion: Motion;
}

/** Position d'un mouvement pour une ouverture de 0 (fermé) à 1 (ouvert) : angle ou décalage. */
export const motionAt = (motion: Motion, openness: number) => motion.closed + (motion.open - motion.closed) * openness;

// ── Noms ─────────────────────────────────────────────────────────────────────

const STRUCTURE = /^(?:lvl\d{3})?(wall|room)_(\d+)_\d+$/;

/** Mur ou sol de l'export, écartés des ouvertures — et, pour un mur, son numéro. */
export function structureOf(name: string): { type: 'wall' | 'room'; id: string } | null {
  const match = STRUCTURE.exec(name);
  return match ? { type: match[1] as 'wall' | 'room', id: match[2] } : null;
}

/**
 * Ce que dit un nom de nœud. Un nom purement numérique n'a plus de famille :
 * son objet n'avait pas de nom valide. Un nom qui ne suit pas la convention —
 * une autre application — est une famille d'un seul composant.
 */
export function parseNodeName(name: string): NodeName {
  const level = /^lvl\d{3}/.exec(name)?.[0] ?? '';
  const rest = name.slice(level.length);
  const numeric = /^(\d+)(?:_(\d+))?$/.exec(rest);
  if (numeric) return { level, family: '', component: Number(numeric[1]), k: Number(numeric[2] ?? 0) };
  // La famille la plus courte : `Porte_en_bois_1_2` est le composant 1 de la
  // troisième `Porte_en_bois`, pas le composant 2 d'une `Porte_en_bois_1`.
  const named = /^(.+?)_(\d+)(?:_(\d+))?$/.exec(rest);
  if (named) return { level, family: named[1], component: Number(named[2]), k: Number(named[3] ?? 0) };
  return { level, family: rest, component: 0, k: 0 };
}

/** Mots d'un nom : `PorteFenetre_Sejour` → porte, fenetre, sejour. */
const words = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean);

/**
 * Type d'ouverture d'après les mots du nom — la nomenclature met le type en
 * premier (`Porte_Cuisine`, `Baie_Salon`…), mais un nom du catalogue le dit
 * aussi (`Porte_coulissante_grise`). Du plus précis au plus vague : une porte
 * coulissante glisse, une porte de garage s'enroule.
 */
const KIND_WORDS: [RegExp, OpeningKind][] = [
  [/^(baie|coulissant|sliding|slider)/, 'sliding'],
  [/^garage/, 'garage'],
  [/^(volet|shutter|store|blind)/, 'shutter'],
  [/^(fenetre|window|velux|lucarne)/, 'window'],
  [/^(porte|door|portail|gate)$/, 'door'],
];

export function guessOpeningKind(family: string): OpeningKind | null {
  const tokens = words(family);
  for (const [pattern, kind] of KIND_WORDS) if (tokens.some(t => pattern.test(t))) return kind;
  return null;
}

// ── Nœuds ────────────────────────────────────────────────────────────────────

/** Au-delà, les sommets au sol d'un nœud sont échantillonnés. */
const MAX_FOOTPRINT = 1024;

/**
 * Un nœud d'après ses sommets (`x, y, z` à la suite), dans les coordonnées de
 * la maquette : sa boîte, et ses sommets au sol sans doublons — un maillage
 * répète chaque point pour chaque face, et un panneau vertical n'en a que
 * quatre au sol.
 */
export function modelNode(name: string, positions: ArrayLike<number>): ModelNode {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  // Clé numérique, au centième près : un texte par sommet coûterait cher sur
  // une grosse maquette. Exacte jusqu'à ± 20 km en centimètres.
  const seen = new Map<number, [number, number]>();
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
    const key = Math.round(x * 100) * 4294967296 + Math.round(z * 100) + 2147483648;
    if (!seen.has(key)) seen.set(key, [x, z]);
  }
  let footprint = [...seen.values()];
  if (footprint.length > MAX_FOOTPRINT) {
    // Échantillonné, mais les extrêmes gardés : la boîte reste juste.
    const step = footprint.length / MAX_FOOTPRINT;
    const extremes = [0, 1].flatMap(axis => [
      footprint.reduce((a, p) => (p[axis] < a[axis] ? p : a)),
      footprint.reduce((a, p) => (p[axis] > a[axis] ? p : a)),
    ]);
    footprint = [...Array.from({ length: MAX_FOOTPRINT }, (_, i) => footprint[Math.floor(i * step)]), ...extremes];
  }
  if (!Number.isFinite(min[0])) return { name, min: [0, 0, 0], max: [0, 0, 0], footprint: [] };
  return { name, min, max, footprint };
}

type Box = { min: Vec3; max: Vec3 };

const touches = (a: Box, b: Box, tolerance: number) =>
  [0, 1, 2].every(i => a.min[i] - tolerance <= b.max[i] && b.min[i] - tolerance <= a.max[i]);

const union = (boxes: Box[]): Box => ({
  min: [0, 1, 2].map(i => Math.min(...boxes.map(b => b.min[i]))) as Vec3,
  max: [0, 1, 2].map(i => Math.max(...boxes.map(b => b.max[i]))) as Vec3,
});

/**
 * Un centimètre dans l'unité de la maquette, d'après sa taille. Sweet Home 3D
 * exporte en centimètres, Blender en mètres ; une maison, jardin compris,
 * mesure plus de 2 m et moins de 200 m : au-delà de 200 unités, des centimètres.
 */
function centimeter(box: Box) {
  const diagonal = Math.hypot(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);
  return diagonal > 0 && diagonal < 200 ? 0.01 : 1;
}

/** Regroupe ce qui se touche, de proche en proche. */
function clusters<T extends Box>(items: T[], tolerance: number): T[][] {
  const parent = items.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (touches(items[i], items[j], tolerance)) parent[root(i)] = root(j);
    }
  }
  const groups = new Map<number, T[]>();
  items.forEach((item, i) => {
    const r = root(i);
    groups.set(r, [...(groups.get(r) ?? []), item]);
  });
  return [...groups.values()];
}

// ── Géométrie ────────────────────────────────────────────────────────────────

type Vec2 = [number, number];

const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];

/** Axe principal d'un nuage de points au sol, unitaire, orienté vers les x croissants. */
function principalAxis(points: Vec2[]): Vec2 {
  if (points.length < 2) return [1, 0];
  const mx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const mz = points.reduce((s, p) => s + p[1], 0) / points.length;
  let xx = 0;
  let xz = 0;
  let zz = 0;
  for (const [x, z] of points) {
    xx += (x - mx) ** 2;
    xz += (x - mx) * (z - mz);
    zz += (z - mz) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * xz, xx - zz);
  return canonical([Math.cos(angle), Math.sin(angle)]);
}

/**
 * Un axe a deux sens : on garde toujours le même, pour que « gauche » et
 * « droite » ne changent pas — vers les x croissants, ou, pour un axe à moins
 * de 3° des z, vers les z croissants : le cadre d'une baie le long des z, aux
 * sommets pas tout à fait alignés, penche d'un dixième de degré.
 */
const canonical = (a: Vec2): Vec2 => (a[0] > 0.05 || (Math.abs(a[0]) <= 0.05 && a[1] > 0) ? a : [-a[0], -a[1]]);

/** La plus large pièce au sol : le cadre d'une ouverture, d'ordinaire. */
const widest = <T extends ModelNode>(nodes: T[]) =>
  nodes.reduce((a, n) =>
    Math.hypot(n.max[0] - n.min[0], n.max[2] - n.min[2]) > Math.hypot(a.max[0] - a.min[0], a.max[2] - a.min[2]) ? n : a
  );

/** Étendue d'un nœud le long d'un axe au sol. */
function extent(node: ModelNode, axis: Vec2): Vec2 {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of node.footprint) {
    const v = dot(p, axis);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

// ── Reconnaître les ouvertures ───────────────────────────────────────────────

/**
 * Les objets de la maquette, et leurs familles.
 *
 * La famille vient du nom ; ses objets, de la géométrie : les composants
 * d'une porte se touchent — le battant contre son cadre, la poignée sur le
 * battant —, ceux de deux portes de même nom, non. On ne regroupe qu'au sein
 * d'une famille : une armoire collée au chambranle n'est jamais prise pour la
 * porte. Deux objets de même nom qui se touchent se séparent par leur reprise
 * `k`. Les objets sans nom valide, eux, n'ont que la géométrie.
 */
export function detectOpenings(nodes: ModelNode[]): ModelOpenings {
  const all = nodes.filter(n => n.footprint.length);
  const whole = all.length ? union(all) : { min: [0, 0, 0] as Vec3, max: [0, 0, 0] as Vec3 };
  const cm = centimeter(whole);
  const center: [number, number] = [(whole.min[0] + whole.max[0]) / 2, (whole.min[2] + whole.max[2]) / 2];

  // Les murs, chacun d'un seul tenant : ses faces sont des nœuds séparés.
  const wallFaces = new Map<string, ModelNode[]>();
  const objects: (ModelNode & NodeName)[] = [];
  for (const node of all) {
    const structure = structureOf(node.name);
    if (structure?.type === 'wall') wallFaces.set(structure.id, [...(wallFaces.get(structure.id) ?? []), node]);
    if (!structure) objects.push({ ...node, ...parseNodeName(node.name) });
  }
  const walls = [...wallFaces.values()].map(union);
  /**
   * Logé dans un mur : le milieu de sa plus large pièce — le cadre d'une porte,
   * que son battant entrouvert fasse déborder ou non l'ensemble. Un meuble
   * contre le mur a le sien devant.
   */
  const inWall = (node: ModelNode) => {
    const middle = [0, 1, 2].map(i => (node.min[i] + node.max[i]) / 2);
    return walls.some(w => middle.every((v, i) => v >= w.min[i] - cm && v <= w.max[i] + cm));
  };

  const byFamily = new Map<string, (ModelNode & NodeName)[]>();
  for (const o of objects) {
    const key = `${o.level}\u0000${o.family}`;
    byFamily.set(key, [...(byFamily.get(key) ?? []), o]);
  }

  // L'ordre du fichier, qui est celui de la maison dans Sweet Home 3D.
  const order = new Map(nodes.map((node, i) => [node.name, i]));
  const openings: DetectedOpening[] = [];
  for (const members of byFamily.values()) {
    const groups = clusters(members, cm).flatMap(group => {
      const components = group.map(n => n.component);
      if (!group[0].family || new Set(components).size === components.length) return [group];
      // Un nom qui finit par un nombre — `Fenetre_sal_1` — donne
      // `Fenetre_sal_1_1`, `Fenetre_sal_1_2`… : lus comme autant de reprises
      // d'un seul composant, sans première fois. C'est un seul objet, et ce
      // nombre fait partie de son nom.
      const ks = group.map(n => n.k);
      if (new Set(components).size === 1 && !ks.includes(0) && new Set(ks).size === ks.length) {
        return [group.map(n => ({ ...n, family: `${n.family}_${n.component}`, component: n.k, k: 0 }))];
      }
      // Deux objets de même nom qui se touchent : chacun ses composants.
      const byK = new Map<number, typeof group>();
      for (const n of group) byK.set(n.k, [...(byK.get(n.k) ?? []), n]);
      return [...byK.values()];
    });
    for (const group of groups) {
      const first = group.reduce((a, n) => (n.component < a.component || (n.component === a.component && n.k < a.k) ? n : a));
      const box = union(group);
      const main = widest(group);
      const axis = principalAxis(main.footprint);
      const along = extent(main, axis);
      openings.push({
        id: first.name,
        family: first.family,
        index: 0,
        nodes: group.map(n => n.name),
        min: box.min,
        max: box.max,
        size: [Math.round((along[1] - along[0]) / cm), Math.round((box.max[1] - box.min[1]) / cm)],
        inWall: inWall(main),
        axis,
        along,
        across: extent(main, [-axis[1], axis[0]]),
      });
    }
  }
  openings.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  // Rang de chaque objet dans sa famille, dans l'ordre du fichier.
  const ranks = new Map<string, number>();
  for (const o of openings) {
    o.index = (ranks.get(o.family) ?? 0) + 1;
    ranks.set(o.family, o.index);
  }

  const families: OpeningFamily[] = [];
  for (const o of openings) {
    if (!o.family) continue;
    const family = families.find(f => f.name === o.family);
    if (family) {
      family.count++;
      family.inWall ||= o.inWall;
    } else families.push({ name: o.family, count: 1, inWall: o.inWall, kind: guessOpeningKind(o.family), size: o.size });
  }
  return { openings, families, unnamed: openings.filter(o => !o.family && o.inWall).length, cm, center, levels: modelLevels(all) };
}

/** Un niveau d'une maison à étages : son sol, et le haut de ses murs, dans les coordonnées de la maquette. */
export interface ModelLevel {
  /** `lvl000`, `lvl001`… : le préfixe de ses nœuds. */
  id: string;
  floor: number;
  top: number;
}

/** Niveau d'un nœud d'une maison à étages ; vide de plain-pied. */
export const levelOf = (name: string) => /^lvl\d{3}/.exec(name)?.[0] ?? '';

/**
 * Les niveaux d'une maison à étages, du plus bas au plus haut — aucun de
 * plain-pied : ExportToHASS ne préfixe ses nœuds d'un `lvl<nnn>` que s'il y en
 * a plusieurs. Le sol d'un niveau : le plus bas de ses sols (`room`), sinon de
 * ses objets ; son haut : celui de ses murs, sinon de ses objets.
 */
export function modelLevels(nodes: ModelNode[]): ModelLevel[] {
  const byLevel = new Map<string, ModelNode[]>();
  for (const node of nodes) {
    const level = levelOf(node.name);
    if (level && node.footprint.length) byLevel.set(level, [...(byLevel.get(level) ?? []), node]);
  }
  if (byLevel.size < 2) return [];
  return [...byLevel]
    .map(([id, list]) => {
      const rooms = list.filter(n => structureOf(n.name)?.type === 'room');
      const walls = list.filter(n => structureOf(n.name)?.type === 'wall');
      return {
        id,
        floor: Math.min(...(rooms.length ? rooms : list).map(n => n.min[1])),
        top: Math.max(...(walls.length ? walls : list).map(n => n.max[1])),
      };
    })
    .sort((a, b) => a.floor - b.floor);
}

/**
 * Haut des murs, dans les coordonnées de la maquette — `null` : elle ne les
 * distingue pas. Un objet plus haut qu'eux, un conduit, un velux, n'y compte pas.
 */
export function wallTop(nodes: Iterable<ModelNode>): number | null {
  let top = -Infinity;
  for (const node of nodes) if (structureOf(node.name)?.type === 'wall') top = Math.max(top, node.max[1]);
  return Number.isFinite(top) ? top : null;
}

/**
 * Les meubles : les objets qui ne sont ni murs ni sols, ni logés dans un mur
 * — des portes, des fenêtres —, ni nommés comme une ouverture : un volet
 * roulant est posé devant le mur. La coupe des murs ne les tranche pas : ils
 * s'estompent.
 */
export function furnitureNodes(model: ModelOpenings): string[] {
  return model.openings.filter(o => !o.inWall && !guessOpeningKind(o.family)).flatMap(o => o.nodes);
}

// ── Parties mobiles ──────────────────────────────────────────────────────────

/** Angle, en `rotation.y` de three.js, qui amène la direction `from` sur `to` (dans ]−π, π]). */
function turn(from: Vec2, to: Vec2) {
  const angle = Math.atan2(-to[1], to[0]) - Math.atan2(-from[1], from[0]);
  return angle > Math.PI ? angle - 2 * Math.PI : angle <= -Math.PI ? angle + 2 * Math.PI : angle;
}

/** Un panneau et son repère : son axe au sol, la normale, et son étendue le long de chacun. */
interface Panel {
  node: ModelNode;
  axis: Vec2;
  normal: Vec2;
  along: Vec2;
  across: Vec2;
  /** Longueur au sol, le long de son axe. */
  length: number;
  height: number;
}

/** Un panneau mobile, et ce qu'il emporte : vitre, poignée, charnières. */
type Leaf = { panel: Panel; nodes: ModelNode[] };

function panel(node: ModelNode): Panel {
  const axis = principalAxis(node.footprint);
  const normal: Vec2 = [-axis[1], axis[0]];
  const along = extent(node, axis);
  return {
    node,
    axis,
    normal,
    along,
    across: extent(node, normal),
    length: along[1] - along[0],
    height: node.max[1] - node.min[1],
  };
}

/**
 * Parties mobiles d'une ouverture, et leur mouvement.
 *
 * - le **cadre** court sur toute la largeur de l'ouverture : il ne bouge pas,
 *   et c'est lui qui donne l'axe du mur ;
 * - un **panneau** — battant, vantail, panneau coulissant — est grand et
 *   vertical, dans le cadre ; ce qu'il contient (vitre, poignée, charnières)
 *   bouge avec lui ;
 * - un battant tourne sur ses gonds. Modélisé entrouvert, il dit lui-même où
 *   ils sont — l'arête contre le mur — et de quel côté il s'ouvre ; fermé,
 *   c'est aux charnières de le dire, sinon à la poignée, à l'opposé, sinon à
 *   la place du vantail — un vantail d'une fenêtre double a ses gonds contre
 *   le montant. Une poignée ou des charnières d'un seul côté disent où il
 *   s'ouvre ; à défaut, vers l'intérieur de la maison ;
 * - un panneau coulissant glisse le long du mur. Un vide entre deux panneaux :
 *   la baie est modélisée ouverte, ils s'y rejoignent pour la fermer. Sinon,
 *   le premier glisse sur son voisin ;
 * - le tablier d'un volet roulant, le panneau d'une porte de garage
 *   s'enroulent vers le haut, comme ceux qu'on dessine.
 *
 * `flip` : l'ouverture de l'autre côté du mur, ou l'autre panneau d'une baie ;
 * `hinge` : les gonds sur l'autre arête. Rien de mobile : une liste vide.
 */
export function openingMotion(
  nodes: ModelNode[],
  kind: OpeningKind,
  { cm, center, flip = false, hinge = false }: { cm: number; center: [number, number]; flip?: boolean; hinge?: boolean }
): MovingPart[] {
  const withPoints = nodes.filter(n => n.footprint.length);
  if (!withPoints.length) return [];
  // L'axe du mur : celui de sa plus large pièce, le cadre d'ordinaire.
  const u = principalAxis(widest(withPoints).footprint);
  const n: Vec2 = [-u[1], u[0]];
  const spans = new Map(withPoints.map(node => [node, { u: extent(node, u), n: extent(node, n) }]));
  const u0 = Math.min(...withPoints.map(node => spans.get(node)!.u[0]));
  const u1 = Math.max(...withPoints.map(node => spans.get(node)!.u[1]));
  const bottom = Math.min(...withPoints.map(node => node.min[1]));
  const top = Math.max(...withPoints.map(node => node.max[1]));
  const width = u1 - u0;
  const height = top - bottom;
  const middle = (u0 + u1) / 2;

  const frame = withPoints.filter(node => spans.get(node)!.u[1] - spans.get(node)!.u[0] >= 0.97 * width);
  // Le plan du mur : le milieu du cadre dans l'épaisseur.
  const plane =
    (frame.length ? frame : withPoints).reduce((s, node) => s + (spans.get(node)!.n[0] + spans.get(node)!.n[1]) / 2, 0) /
    (frame.length || withPoints.length);

  /** `part` tient-il dans `leaf` ? Un peu de marge le long du panneau, davantage de part et d'autre — une poignée dépasse. */
  const holds = (leaf: Panel, part: ModelNode) => {
    const along = extent(part, leaf.axis);
    const across = extent(part, leaf.normal);
    return (
      along[0] >= leaf.along[0] - 2 * cm &&
      along[1] <= leaf.along[1] + 2 * cm &&
      across[0] >= leaf.across[0] - 9 * cm &&
      across[1] <= leaf.across[1] + 9 * cm &&
      part.min[1] >= leaf.node.min[1] - 2 * cm &&
      part.max[1] <= leaf.node.max[1] + 2 * cm
    );
  };

  if (kind === 'shutter' || kind === 'garage') return roll(withPoints, { frame, width, height, bottom, holds });

  // Les panneaux, du plus grand au plus petit : une vitre tient dans son
  // vantail, et le suit.
  const candidates = withPoints
    .filter(node => !frame.includes(node))
    .map(panel)
    .filter(p => p.height >= 0.45 * height && p.length >= 0.15 * width)
    .sort((a, b) => b.length * b.height - a.length * a.height);
  const leaves: Leaf[] = [];
  for (const candidate of candidates) {
    const owner = leaves.find(l => holds(l.panel, candidate.node));
    if (owner) owner.nodes.push(candidate.node);
    else leaves.push({ panel: candidate, nodes: [candidate.node] });
  }
  if (!leaves.length) return [];
  const small = withPoints.filter(node => !frame.includes(node) && !leaves.some(l => l.nodes.includes(node)));
  const centerOf = (box: Box): Vec2 => [(box.min[0] + box.max[0]) / 2, (box.min[2] + box.max[2]) / 2];
  for (const part of small) {
    // Tenu par plusieurs (deux vantaux qui se chevauchent) : le plus proche.
    const c = centerOf(part);
    const distance = (leaf: Leaf) => Math.hypot(c[0] - centerOf(leaf.panel.node)[0], c[1] - centerOf(leaf.panel.node)[1]);
    const owner = leaves.filter(l => holds(l.panel, part)).sort((a, b) => distance(a) - distance(b))[0];
    owner?.nodes.push(part);
  }
  const names = (leaf: Leaf) => leaf.nodes.map(node => node.name);

  if (kind === 'sliding')
    return slide(leaves, { u, width, u0, u1, flip, spans: node => extent(node, u) }).map(({ leaf, motion }) => ({
      nodes: names(leaf),
      motion,
    }));
  return swing(leaves, small, { u, n, plane, middle, center, cm, flip, hinge }).map(({ leaf, motion }) => ({
    nodes: names(leaf),
    motion,
  }));
}

/** Enroulé : il en reste un liseré, sous le coffre. */
const ROLLED = 0.04;

/**
 * Le tablier d'un volet roulant, le panneau d'une porte de garage : le plus
 * grand, plus large que haut de moitié au moins — les coulisses sont étroites,
 * le coffre bas. Pas le cadre, s'il y en a un : une porte de garage sans cadre
 * n'a que son panneau. Il s'enroule vers son haut ; modélisé à mi-course, il
 * descend jusqu'en bas pour fermer.
 */
function roll(
  nodes: ModelNode[],
  {
    frame,
    width,
    height,
    bottom,
    holds,
  }: { frame: ModelNode[]; width: number; height: number; bottom: number; holds: (leaf: Panel, part: ModelNode) => boolean }
): MovingPart[] {
  const apron = nodes
    .map(panel)
    .filter(p => p.height >= 0.45 * height && p.length >= 0.5 * width)
    .sort((a, b) => Number(frame.includes(a.node)) - Number(frame.includes(b.node)) || b.length * b.height - a.length * a.height)[0];
  if (!apron) return [];
  const carried = nodes.filter(node => node !== apron.node && !frame.includes(node) && holds(apron, node));
  const top = apron.node.max[1];
  return [
    {
      nodes: [apron.node, ...carried].map(node => node.name),
      motion: { type: 'roll', top, closed: (top - bottom) / apron.height, open: ROLLED },
    },
  ];
}

/**
 * Un volet lié à une fenêtre, une porte ou une baie : la maquette n'a pas son
 * tablier — c'est la fenêtre entière qui s'enroulerait. On en pose un devant,
 * et elle ne bouge plus. Ce qu'est l'objet, son nom le dit, sinon le type
 * choisi ; ce qui bouge, l'entité — un volet — ou le type « Volet ».
 */
export function shutsInFront(family: string, kind: OpeningKind, entity: LinkCandidate) {
  const nature = guessOpeningKind(family) ?? kind;
  if (nature === 'shutter' || nature === 'garage') return false;
  return kind === 'shutter' || movableKinds(entity).includes('shutter');
}

/**
 * Où poser ce volet : les deux coins de l'ouverture sur sa face du dehors —
 * loin du centre de la maison —, comme on dessine un volet, et ce côté-là.
 */
export function frontShutter(
  { axis, along, across, min, max }: DetectedOpening,
  center: [number, number]
): { a: Vec3; b: Vec3; side: 1 | -1 } {
  const normal: Vec2 = [-axis[1], axis[0]];
  const side = (across[0] + across[1]) / 2 > dot(center, normal) ? 1 : -1;
  const face = side > 0 ? across[1] : across[0];
  const corner = (t: number, y: number): Vec3 => [axis[0] * t + normal[0] * face, y, axis[1] * t + normal[1] * face];
  return { a: corner(along[0], min[1]), b: corner(along[1], max[1]), side };
}

/** Panneaux qui glissent : ceux qui bordent un vide s'y rejoignent, sinon le premier glisse sur son voisin. */
function slide(
  leaves: Leaf[],
  { u, width, u0, u1, flip, spans }: { u: Vec2; width: number; u0: number; u1: number; flip: boolean; spans: (node: ModelNode) => Vec2 }
): { leaf: Leaf; motion: Motion }[] {
  const sorted = leaves
    .map(leaf => ({ leaf, span: spans(leaf.panel.node) }))
    .sort((a, b) => a.span[0] + a.span[1] - (b.span[0] + b.span[1]));
  const gaps = sorted.slice(1).map((next, i) => next.span[0] - sorted[i].span[1]);
  const widest = gaps.reduce((best, gap, i) => (gap > (gaps[best] ?? -Infinity) ? i : best), 0);
  if (gaps.length && gaps[widest] > 0.05 * width) {
    // Modélisée ouverte : les deux panneaux du vide s'y rejoignent pour fermer.
    const gap = gaps[widest];
    return [
      { leaf: sorted[widest].leaf, motion: { type: 'slide', axis: u, closed: gap / 2, open: 0 } },
      { leaf: sorted[widest + 1].leaf, motion: { type: 'slide', axis: u, closed: -gap / 2, open: 0 } },
    ];
  }
  // Modélisée fermée : le premier panneau glisse sur son voisin (le dernier, à l'envers).
  const active = flip ? sorted[sorted.length - 1] : sorted[0];
  const neighbor = sorted.length > 1 ? (flip ? sorted[sorted.length - 2] : sorted[1]) : null;
  const length = active.span[1] - active.span[0];
  let direction = flip ? -1 : 1;
  let travel: number;
  if (neighbor) {
    const overlap = Math.max(0, flip ? neighbor.span[1] - active.span[0] : active.span[1] - neighbor.span[0]);
    travel = length - overlap;
  } else {
    // Seul : vers le côté où le cadre laisse le plus de place.
    direction = u1 - active.span[1] >= active.span[0] - u0 ? 1 : -1;
    if (flip) direction = -direction;
    travel = length * 0.95;
  }
  return [{ leaf: active.leaf, motion: { type: 'slide', axis: u, closed: 0, open: direction * travel } }];
}

/** Au-delà de cet angle avec le mur (radians, ≈ 8°), un battant est modélisé entrouvert. */
const AJAR = 0.14;
/** Écart vertical de petites pièces, en part de la hauteur du battant, qui en fait des charnières plutôt qu'une poignée. */
const HINGE_SPREAD = 0.35;

/** Battants qui tournent sur leurs gonds. */
function swing(
  leaves: Leaf[],
  small: ModelNode[],
  {
    u,
    n,
    plane,
    middle,
    center,
    cm,
    flip,
    hinge,
  }: {
    u: Vec2;
    n: Vec2;
    plane: number;
    middle: number;
    center: [number, number];
    cm: number;
    flip: boolean;
    hinge: boolean;
  }
): { leaf: Leaf; motion: Motion }[] {
  /** Les deux arêtes verticales d'un battant (x, z), au milieu de son épaisseur. */
  const edges = (p: Panel): [Vec2, Vec2] => {
    const mid = (p.across[0] + p.across[1]) / 2;
    const at = (t: number): Vec2 => [p.axis[0] * t + p.normal[0] * mid, p.axis[1] * t + p.normal[1] * mid];
    return [at(p.along[0]), at(p.along[1])];
  };
  /** Petites pièces près d'une arête : charnières, poignée. */
  const near = (p: Panel, end: 0 | 1) =>
    small.filter(part => {
      const along = extent(part, p.axis);
      const across = extent(part, p.normal);
      const edge = p.along[end];
      return (
        along[1] >= edge - 6 * cm &&
        along[0] <= edge + 6 * cm &&
        across[0] >= p.across[0] - 9 * cm &&
        across[1] <= p.across[1] + 9 * cm &&
        part.max[1] >= p.node.min[1] - 2 * cm &&
        part.min[1] <= p.node.max[1] + 2 * cm
      );
    });
  /** Des charnières : plusieurs pièces étagées, ou une longue bande. */
  const spread = (p: Panel, parts: ModelNode[]) => {
    if (!parts.length) return 0;
    const tall = parts.some(part => part.max[1] - part.min[1] >= HINGE_SPREAD * p.height);
    if (parts.length < 2 && !tall) return 0;
    return (Math.max(...parts.map(part => part.max[1])) - Math.min(...parts.map(part => part.min[1]))) / p.height;
  };
  /** Côté du mur (1 : le long de `n`, −1 : à l'opposé) où sont ces pièces, si elles sont toutes du même côté du battant. */
  const oneSide = (p: Panel, parts: ModelNode[]): 1 | -1 | 0 => {
    const mid = (p.across[0] + p.across[1]) / 2;
    const sides = new Set(
      parts.map(part => {
        const across = extent(part, p.normal);
        return across[0] >= mid - 0.2 * cm ? 1 : across[1] <= mid + 0.2 * cm ? -1 : 0;
      })
    );
    if (sides.size !== 1 || sides.has(0)) return 0;
    return (([...sides][0] * Math.sign(dot(p.normal, n))) as 1 | -1) || 0;
  };

  let side: 1 | -1 | 0 = 0;
  const plans = leaves.map(leaf => {
    const p = leaf.panel;
    const [e0, e1] = edges(p);
    const tilt = Math.acos(Math.min(1, Math.abs(dot(p.axis, u))));
    if (tilt > AJAR) {
      // Entrouvert : l'arête contre le mur porte les gonds ; l'autre dit où il s'ouvre.
      const hingeEnd: 0 | 1 = Math.abs(dot(e0, n) - plane) <= Math.abs(dot(e1, n) - plane) ? 0 : 1;
      const free = hingeEnd ? e0 : e1;
      side ||= Math.sign(dot(free, n) - plane) as 1 | -1;
      return { leaf, e0, e1, hingeEnd };
    }
    const parts: [ModelNode[], ModelNode[]] = [near(p, 0), near(p, 1)];
    const spreads = [spread(p, parts[0]), spread(p, parts[1])];
    let hingeEnd: 0 | 1;
    if (Math.max(...spreads) >= HINGE_SPREAD && spreads[0] !== spreads[1]) hingeEnd = spreads[0] > spreads[1] ? 0 : 1;
    else if (parts[0].length !== parts[1].length && !(parts[0].length && parts[1].length)) hingeEnd = parts[0].length ? 1 : 0;
    // Plusieurs vantaux : les gonds contre le montant, loin du milieu.
    else if (leaves.length > 1) hingeEnd = Math.abs(dot(e0, u) - middle) >= Math.abs(dot(e1, u) - middle) ? 0 : 1;
    else hingeEnd = dot(e0, u) <= dot(e1, u) ? 0 : 1;
    // Une poignée d'un seul côté — une fenêtre, qui ne s'ouvre que de
    // l'intérieur —, sinon des charnières qui dépassent d'un seul côté.
    side ||= oneSide(p, parts[hingeEnd ? 0 : 1]) || oneSide(p, parts[hingeEnd]);
    return { leaf, e0, e1, hingeEnd };
  });
  // Rien ne le dit : vers l'intérieur de la maison.
  if (!side) side = dot(center, n) - plane >= 0 ? 1 : -1;
  if (flip) side = -side as 1 | -1;

  return plans.map(({ leaf, e0, e1, hingeEnd: modeled }) => {
    const hingeEnd = hinge ? ((1 - modeled) as 0 | 1) : modeled;
    const pivot = hingeEnd ? e1 : e0;
    const free = hingeEnd ? e0 : e1;
    const toFree: Vec2 = [free[0] - pivot[0], free[1] - pivot[1]];
    const length = Math.hypot(...toFree) || 1;
    const current: Vec2 = [toFree[0] / length, toFree[1] / length];
    // Fermé, le battant court le long du mur, des gonds vers l'autre montant.
    const inward = Math.sign(middle - dot(pivot, u)) || Math.sign(dot(current, u)) || 1;
    const shut: Vec2 = [u[0] * inward, u[1] * inward];
    const closed = turn(current, shut);
    // Le sens de rotation qui envoie l'arête libre du côté où il s'ouvre.
    const velocity: Vec2 = [shut[1], -shut[0]];
    const way = Math.sign(dot(velocity, [n[0] * side, n[1] * side])) || 1;
    return { leaf, motion: { type: 'swing' as const, pivot, closed, open: closed + way * SWING } };
  });
}

/** Nom d'une ouverture : sa famille, et son rang quand la famille en compte plusieurs. */
export function openingLabel(opening: DetectedOpening, families: OpeningFamily[]) {
  const count = families.find(f => f.name === opening.family)?.count ?? 1;
  return count > 1 ? `${opening.family} · ${opening.index}` : opening.family;
}

// ── Réglage ──────────────────────────────────────────────────────────────────

/** Une ouverture de la maquette liée à une entité. */
export interface OpeningLink {
  /**
   * Le nœud de son premier composant, qui la désigne : un nom, jamais un
   * indice — il survit à un nouvel export, pourvu que l'objet garde son nom.
   */
  node: string;
  entityId: string;
  /** S'ouvre de l'autre côté du mur ; pour une baie, l'autre panneau glisse. */
  flip?: boolean;
  /** Ses gonds sont sur l'autre arête du battant. */
  hinge?: boolean;
}

/** Les ouvertures d'une maquette (`floorplan.openings`) : le type de ses familles, et les liaisons. */
export interface FloorplanOpenings {
  /** Type choisi à la main, par famille — `none` : écartée. Une famille absente se devine d'après son nom. */
  kinds?: Record<string, OpeningKind | 'none'>;
  links?: OpeningLink[];
}

/** Réglage lisible : ce qui est illisible est écarté, pas fatal. */
export function normalizeOpenings(value: unknown): { kinds: Record<string, OpeningKind | 'none'>; links: OpeningLink[] } {
  const config = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const kinds = Object.fromEntries(
    Object.entries(config.kinds && typeof config.kinds === 'object' ? config.kinds : {}).filter(
      (entry): entry is [string, OpeningKind | 'none'] => entry[1] === 'none' || OPENING_KINDS.includes(entry[1] as OpeningKind)
    )
  );
  const links = (Array.isArray(config.links) ? config.links : []).flatMap((l: unknown) => {
    const link = (l && typeof l === 'object' ? l : {}) as Record<string, unknown>;
    if (typeof link.node !== 'string' || !link.node || typeof link.entityId !== 'string') return [];
    return [
      { node: link.node, entityId: link.entityId, ...(link.flip === true && { flip: true }), ...(link.hinge === true && { hinge: true }) },
    ];
  });
  return { kinds, links };
}

/** Type d'une famille : choisi à la main, sinon deviné d'après son nom — `null` : écartée, ou rien n'y ressemble. */
export function familyKind(family: string, kinds: Record<string, OpeningKind | 'none'>): OpeningKind | null {
  const chosen = kinds[family];
  if (chosen) return chosen === 'none' ? null : chosen;
  return family ? guessOpeningKind(family) : null;
}

/** Les ouvertures des familles retenues — un type, choisi ou deviné —, dans l'ordre de la maison. */
export const typedOpenings = (model: ModelOpenings, kinds: Record<string, OpeningKind | 'none'>) =>
  model.openings.filter(o => o.family && familyKind(o.family, kinds));

// ── Liaisons proposées ───────────────────────────────────────────────────────

/** Une entité qui pourrait mouvoir une ouverture. */
export interface LinkCandidate {
  entityId: string;
  name?: string;
  deviceClass?: unknown;
}

/** Mots d'un nom, sans accents ni casse : `Porte_Entree`, « Porte d'entrée » → porte, entree. */
const nameWords = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Mots qui disent ce qu'est une ouverture, pas laquelle. */
const TYPE_WORD =
  /^(baie|coulissante?|sliding|slider|garage|volet|shutter|store|blind|fenetre|window|velux|lucarne|porte|door|portail|gate)$/;

/** Ce qu'une entité peut mouvoir : un contact de porte une porte, un volet un volet. */
function movableKinds({ entityId, deviceClass }: LinkCandidate): OpeningKind[] {
  if (entityId.startsWith('cover.')) {
    if (deviceClass === 'garage') return ['garage'];
    if (deviceClass === 'door' || deviceClass === 'gate') return ['door', 'sliding'];
    if (deviceClass === 'window') return ['window'];
    return ['shutter'];
  }
  if (!entityId.startsWith('binary_sensor.')) return [];
  if (deviceClass === 'door') return ['door', 'sliding'];
  if (deviceClass === 'window') return ['window', 'sliding'];
  if (deviceClass === 'opening') return ['door', 'sliding', 'window'];
  if (deviceClass === 'garage_door') return ['garage'];
  return [];
}

/**
 * Les liaisons que proposent les noms. Pour chaque ouverture sans entité,
 * seule de sa famille — `Porte_en_bois` × 5 ne dit pas laquelle est laquelle —,
 * l'entité qui peut la mouvoir et dont l'identifiant ou le nom contient les
 * mots de la famille, hors celui du type : `Porte_Entree` → `binary_sensor.porte_entree`,
 * ou « Porte d'entrée ». Entre plusieurs, celle qui a le moins de mots en plus ;
 * à égalité, aucune, et une entité qui répond à deux ouvertures n'en lie
 * aucune : deviner, ce serait lier au hasard. Une entité déjà liée n'est pas
 * proposée.
 */
export function suggestLinks(
  model: ModelOpenings,
  kinds: Record<string, OpeningKind | 'none'>,
  links: OpeningLink[],
  entities: LinkCandidate[]
): OpeningLink[] {
  const linkedNodes = new Set(links.map(l => l.node));
  const linkedEntities = new Set(links.map(l => l.entityId));
  const free = entities.filter(e => !linkedEntities.has(e.entityId));
  const suggestions = typedOpenings(model, kinds).flatMap(opening => {
    if (linkedNodes.has(opening.id) || model.families.find(f => f.name === opening.family)?.count !== 1) return [];
    const kind = familyKind(opening.family, kinds)!;
    const all = nameWords(opening.family);
    const which = all.filter(w => !TYPE_WORD.test(w));
    const wanted = which.length ? which : all;
    const scored = free.flatMap(entity => {
      if (!movableKinds(entity).includes(kind)) return [];
      const id = nameWords(entity.entityId.slice(entity.entityId.indexOf('.') + 1));
      const known = new Set([...id, ...nameWords(entity.name ?? '')]);
      return wanted.every(w => known.has(w)) ? [{ entityId: entity.entityId, extra: id.filter(w => !all.includes(w)).length }] : [];
    });
    const best = Math.min(...scored.map(s => s.extra));
    const winners = scored.filter(s => s.extra === best);
    return winners.length === 1 ? [{ node: opening.id, entityId: winners[0].entityId }] : [];
  });
  return suggestions.filter(s => suggestions.filter(o => o.entityId === s.entityId).length === 1);
}

/** Un contact d'ouverture — porte, fenêtre, ouvrant, porte de garage —, pas un détecteur de mouvement. */
export const isContact = (entityId: string, deviceClass: unknown) =>
  entityId.startsWith('binary_sensor.') && movableKinds({ entityId, deviceClass }).length > 0;

/** Les entités d'une maison qui pourraient mouvoir une ouverture : contacts de porte ou de fenêtre, volets. */
export function linkCandidates(entities: Record<string, { attributes?: Record<string, unknown> }> | undefined): LinkCandidate[] {
  return Object.entries(entities ?? {}).flatMap(([entityId, entity]) => {
    const candidate = { entityId, name: friendlyName(entity), deviceClass: entity.attributes?.device_class };
    return movableKinds(candidate).length ? [candidate] : [];
  });
}

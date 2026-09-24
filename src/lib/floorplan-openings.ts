import type { Vec3 } from '@/lib/floorplan';

/**
 * Les ouvertures d'une maquette exportée de Sweet Home 3D avec le plugin
 * ExportToHASS : chaque porte, chaque fenêtre y est faite d'objets séparés —
 * cadre, battant, vitre, poignée, charnières —, qu'on retrouve ici.
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
}

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
  const seen = new Map<string, [number, number]>();
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
    const key = `${Math.round(x * 100)},${Math.round(z * 100)}`;
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
 * Un centimètre dans l'unité de la maquette, d'après sa taille : une maison
 * mesure de 5 à 50 m. Sweet Home 3D exporte en centimètres, Blender en mètres.
 */
function centimeter(box: Box) {
  const diagonal = Math.hypot(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);
  return diagonal > 0 ? 10 ** Math.round(Math.log10(diagonal / 2000)) : 1;
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
      // Deux objets de même nom qui se touchent : chacun ses composants.
      const components = group.map(n => n.component);
      if (!group[0].family || new Set(components).size === components.length) return [group];
      const byK = new Map<number, typeof group>();
      for (const n of group) byK.set(n.k, [...(byK.get(n.k) ?? []), n]);
      return [...byK.values()];
    });
    // Dans l'ordre du fichier : la première reprise d'abord.
    groups.sort((a, b) => Math.min(...a.map(n => n.k)) - Math.min(...b.map(n => n.k)) || order.get(a[0].name)! - order.get(b[0].name)!);
    groups.forEach((group, i) => {
      const first = group.reduce((a, n) => (n.component < a.component || (n.component === a.component && n.k < a.k) ? n : a));
      const box = union(group);
      const main = widest(group);
      const along = extent(main, principalAxis(main.footprint));
      openings.push({
        id: first.name,
        family: first.family,
        index: i + 1,
        nodes: group.map(n => n.name),
        min: box.min,
        max: box.max,
        size: [Math.round((along[1] - along[0]) / cm), Math.round((box.max[1] - box.min[1]) / cm)],
        inWall: inWall(main),
      });
    });
  }
  openings.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  const families: OpeningFamily[] = [];
  for (const o of openings) {
    if (!o.family) continue;
    const family = families.find(f => f.name === o.family);
    if (family) {
      family.count++;
      family.inWall ||= o.inWall;
    } else families.push({ name: o.family, count: 1, inWall: o.inWall, kind: guessOpeningKind(o.family), size: o.size });
  }
  return { openings, families, unnamed: openings.filter(o => !o.family && o.inWall).length, cm, center };
}

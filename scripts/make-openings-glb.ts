/**
 * Génère `tests/dashboard/fixtures/openings.glb` : une petite maquette façon
 * ExportToHASS, pour les tests de bout en bout des ouvertures.
 *
 *     npx tsx scripts/make-openings-glb.ts
 *
 * Comme un export de Sweet Home 3D : des nœuds à plat, un maillage chacun, en
 * centimètres, sans transformation ; murs `wall_<n>_<face>`, sol `room_0_1` ;
 * chaque objet `<Nom>_<composant>`, et les objets sans nom valide réduits à
 * leurs numéros. Une pièce de 6 × 4 m, murs percés à la place des ouvertures :
 * - au nord, `Porte_Cuisine`, fermée, trois charnières côté pièce, une poignée
 *   de part et d'autre ; `Fenetre_Salon`, deux vantaux, leurs vitres, leurs
 *   charnières, une poignée côté pièce ;
 * - à l'est, `Baie_Salon`, deux panneaux coulissants sur deux rails ;
 * - au sud, `Porte_Chambre`, modélisée entrouverte de 50° vers la pièce ; une
 *   fenêtre sans nom valide (`1`, `2`, `3`), et dehors son `Volet_Chambre`,
 *   baissé : coffre, coulisses, tablier ;
 * - à l'ouest, `Garage` : un panneau sans cadre, sa poignée ;
 * - dans la pièce, un `Canape` et une table sans nom (`1_1`, `2_1`).
 */
import fs from 'node:fs';
import path from 'node:path';

type Vec3 = [number, number, number];
/** Une boîte, tournée de `turn` radians (`rotation.y` de three.js) autour de `about` (x, z). */
type Box = { min: Vec3; max: Vec3; turn?: number; about?: [number, number] };

const MATERIALS = {
  wall: { color: [0.94, 0.94, 0.93] },
  floor: { color: [0.69, 0.54, 0.41] },
  wood: { color: [0.6, 0.42, 0.26] },
  white: { color: [0.98, 0.98, 0.98] },
  metal: { color: [0.54, 0.56, 0.6], metal: 0.6 },
  glass: { color: [0.66, 0.81, 0.88], alpha: 0.35 },
  fabric: { color: [0.36, 0.42, 0.55] },
} as const;
type MaterialName = keyof typeof MATERIALS;

const nodes: { name: string; material: MaterialName; boxes: Box[] }[] = [];
const node = (name: string, material: MaterialName, ...boxes: Box[]) => nodes.push({ name, material, boxes });
const box = (min: Vec3, max: Vec3, turn?: { angle: number; about: [number, number] }): Box => ({
  min,
  max,
  ...(turn && { turn: turn.angle, about: turn.about }),
});

// ── Murs, percés, et sol ─────────────────────────────────────────────────────
const H = 250;
/** Un mur le long des x (nord, sud) : ses pans, d'un bout à l'autre, entre les ouvertures. */
function wallX(id: number, z: number, holes: { from: number; to: number; bottom: number; top: number }[]) {
  const faces: Box[] = [];
  let x = -5;
  for (const hole of holes) {
    faces.push(box([x, 0, z - 5], [hole.from, H, z + 5]));
    if (hole.bottom > 0) faces.push(box([hole.from, 0, z - 5], [hole.to, hole.bottom, z + 5]));
    faces.push(box([hole.from, hole.top, z - 5], [hole.to, H, z + 5]));
    x = hole.to;
  }
  faces.push(box([x, 0, z - 5], [605, H, z + 5]));
  faces.forEach((face, i) => node(`wall_${id}_${i + 1}`, 'wall', face));
}
wallX(0, 0, [
  { from: 100, to: 200, bottom: 0, top: 210 },
  { from: 350, to: 550, bottom: 90, top: 220 },
]);
wallX(2, 400, [
  { from: 100, to: 160, bottom: 100, top: 200 },
  { from: 400, to: 500, bottom: 0, top: 210 },
]);
// À l'est, le long des z : la baie.
node('wall_1_1', 'wall', box([595, 0, -5], [605, H, 80]));
node('wall_1_2', 'wall', box([595, 220, 80], [605, H, 320]));
node('wall_1_3', 'wall', box([595, 0, 320], [605, H, 405]));
// À l'ouest, le long des z : la porte de garage.
node('wall_3_1', 'wall', box([-5, 0, -5], [5, H, 150]));
node('wall_3_2', 'wall', box([-5, 220, 150], [5, H, 330]));
node('wall_3_3', 'wall', box([-5, 0, 330], [5, H, 405]));
node('room_0_1', 'floor', box([0, -1, 0], [600, 0, 400]));

// ── Porte_Cuisine : fermée, charnières côté pièce ────────────────────────────
node('Porte_Cuisine_1', 'white', box([100, 0, -4], [108, 210, 4]), box([192, 0, -4], [200, 210, 4]), box([100, 202, -4], [200, 210, 4]));
node('Porte_Cuisine_2', 'wood', box([108, 1, -2], [192, 201, 2]));
node('Porte_Cuisine_3', 'metal', box([112, 95, -5], [118, 100, 5]));
[20, 100, 180].forEach((y, i) => node(`Porte_Cuisine_${4 + i}`, 'metal', box([189, y, 2], [192, y + 4, 3])));

// ── Fenetre_Salon : deux vantaux ─────────────────────────────────────────────
node(
  'Fenetre_Salon_1',
  'white',
  box([350, 90, -4], [355, 220, 4]),
  box([545, 90, -4], [550, 220, 4]),
  box([350, 90, -4], [550, 95, 4]),
  box([350, 215, -4], [550, 220, 4])
);
node('Fenetre_Salon_2', 'white', box([355, 95, -1], [450, 215, 1]));
node('Fenetre_Salon_3', 'white', box([450, 95, -1], [545, 215, 1]));
node('Fenetre_Salon_4', 'glass', box([365, 105, -0.2], [440, 205, 0.2]));
node('Fenetre_Salon_5', 'glass', box([460, 105, -0.2], [535, 205, 0.2]));
node('Fenetre_Salon_6', 'white', box([352, 110, 1], [355, 114, 2]));
node('Fenetre_Salon_7', 'white', box([352, 195, 1], [355, 199, 2]));
node('Fenetre_Salon_8', 'white', box([545, 110, 1], [548, 114, 2]));
node('Fenetre_Salon_9', 'white', box([545, 195, 1], [548, 199, 2]));
node('Fenetre_Salon_10', 'metal', box([442, 150, 1], [446, 160, 3]));

// ── Baie_Salon : deux panneaux sur deux rails ────────────────────────────────
node(
  'Baie_Salon_1',
  'metal',
  box([596, 0, 80], [604, 220, 85]),
  box([596, 0, 315], [604, 220, 320]),
  box([596, 215, 80], [604, 220, 320]),
  box([596, 0, 80], [604, 5, 320])
);
node('Baie_Salon_2', 'metal', box([597, 5, 85], [599, 215, 205]));
node('Baie_Salon_3', 'metal', box([601, 5, 195], [603, 215, 315]));
node('Baie_Salon_4', 'glass', box([597.8, 15, 95], [598.2, 205, 195]));
node('Baie_Salon_5', 'glass', box([601.8, 15, 205], [602.2, 205, 305]));

// ── Porte_Chambre : entrouverte de 50° vers la pièce ─────────────────────────
const ajar = { angle: -0.87, about: [492, 400] as [number, number] };
node(
  'Porte_Chambre_1',
  'white',
  box([400, 0, 396], [408, 210, 404]),
  box([492, 0, 396], [500, 210, 404]),
  box([400, 202, 396], [500, 210, 404])
);
node('Porte_Chambre_2', 'wood', box([408, 1, 399], [492, 201, 401], ajar));
node('Porte_Chambre_3', 'metal', box([412, 95, 396], [418, 100, 404], ajar));

// ── Une fenêtre sans nom valide, au sud ──────────────────────────────────────
node(
  '1',
  'white',
  box([100, 100, 396], [104, 200, 404]),
  box([156, 100, 396], [160, 200, 404]),
  box([100, 100, 396], [160, 104, 404]),
  box([100, 196, 396], [160, 200, 404])
);
node('2', 'white', box([104, 104, 399], [156, 196, 401]));
node('3', 'glass', box([110, 110, 399.8], [150, 190, 400.2]));

// ── Son volet roulant, dehors, baissé ────────────────────────────────────────
node('Volet_Chambre_1', 'white', box([96, 200, 405], [164, 215, 420]));
node('Volet_Chambre_2', 'white', box([96, 100, 405], [100, 200, 410]), box([160, 100, 405], [164, 200, 410]));
node('Volet_Chambre_3', 'white', box([100, 100, 406], [160, 200, 408]));

// ── Garage : un panneau sans cadre ───────────────────────────────────────────
node('Garage_1', 'white', box([-3, 0, 152], [3, 218, 328]));
node('Garage_2', 'metal', box([3, 90, 235], [5, 95, 245]));

// ── Mobilier ─────────────────────────────────────────────────────────────────
node('Canape_1', 'fabric', box([200, 0, 250], [400, 45, 330]));
node('Canape_2', 'fabric', box([200, 45, 310], [400, 85, 330]));
node('1_1', 'wood', box([250, 70, 100], [350, 75, 180]));
node('2_1', 'wood', box([295, 0, 135], [305, 70, 145]));

// ── Écriture du .glb ─────────────────────────────────────────────────────────
const FACES: { normal: Vec3; corners: [number, number, number][] }[] = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
];

const rotate = (x: number, z: number, b: Box): [number, number] => {
  if (!b.turn || !b.about) return [x, z];
  const dx = x - b.about[0];
  const dz = z - b.about[1];
  return [b.about[0] + dx * Math.cos(b.turn) + dz * Math.sin(b.turn), b.about[1] - dx * Math.sin(b.turn) + dz * Math.cos(b.turn)];
};

const chunks: Buffer[] = [];
let offset = 0;
const bufferViews: object[] = [];
const accessors: object[] = [];
function push(data: Buffer, target: number) {
  const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length, target });
  chunks.push(padded);
  offset += padded.length;
  return bufferViews.length - 1;
}

const materialNames = Object.keys(MATERIALS) as MaterialName[];
const meshes = nodes.map(({ name, material, boxes }) => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const b of boxes) {
    for (const { normal, corners } of FACES) {
      const base = positions.length / 3;
      for (const [cx, cy, cz] of corners) {
        const [x, z] = rotate(cx ? b.max[0] : b.min[0], cz ? b.max[2] : b.min[2], b);
        positions.push(x, cy ? b.max[1] : b.min[1], z);
        const [nx, nz] = b.turn ? rotate(normal[0], normal[2], { ...b, about: [0, 0] }) : [normal[0], normal[2]];
        normals.push(nx, normal[1], nz);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const min = [0, 1, 2].map(i => Math.min(...positions.filter((_, k) => k % 3 === i)));
  const max = [0, 1, 2].map(i => Math.max(...positions.filter((_, k) => k % 3 === i)));
  accessors.push({
    bufferView: push(Buffer.from(new Float32Array(positions).buffer), 34962),
    componentType: 5126,
    count: positions.length / 3,
    type: 'VEC3',
    min,
    max,
  });
  const position = accessors.length - 1;
  accessors.push({
    bufferView: push(Buffer.from(new Float32Array(normals).buffer), 34962),
    componentType: 5126,
    count: normals.length / 3,
    type: 'VEC3',
  });
  const normal = accessors.length - 1;
  accessors.push({
    bufferView: push(Buffer.from(new Uint16Array(indices).buffer), 34963),
    componentType: 5123,
    count: indices.length,
    type: 'SCALAR',
  });
  return {
    name,
    primitives: [
      { attributes: { POSITION: position, NORMAL: normal }, indices: accessors.length - 1, material: materialNames.indexOf(material) },
    ],
  };
});

const gltf = {
  asset: { version: '2.0', generator: 'ha-dashboard scripts/make-openings-glb.ts' },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes: nodes.map(({ name }, i) => ({ name, mesh: i })),
  meshes,
  materials: materialNames.map(name => {
    const m: { color: readonly number[]; metal?: number; alpha?: number } = MATERIALS[name];
    return {
      name,
      pbrMetallicRoughness: { baseColorFactor: [...m.color, m.alpha ?? 1], metallicFactor: m.metal ?? 0, roughnessFactor: 0.7 },
      ...(m.alpha !== undefined && { alphaMode: 'BLEND' }),
      doubleSided: false,
    };
  }),
  accessors,
  bufferViews,
  buffers: [{ byteLength: offset }],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const bin = Buffer.concat(chunks);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);
const chunk = (data: Buffer, type: number) => {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(data.length, 0);
  head.writeUInt32LE(type, 4);
  return Buffer.concat([head, data]);
};
const file = path.resolve(import.meta.dirname, '../tests/dashboard/fixtures/openings.glb');
fs.writeFileSync(file, Buffer.concat([header, chunk(jsonChunk, 0x4e4f534a), chunk(bin, 0x004e4942)]));
console.info(`${path.relative(process.cwd(), file)} : ${nodes.length} nœuds`);

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  detectOpenings,
  guessOpeningKind,
  modelNode,
  parseNodeName,
  structureOf,
  type ModelNode,
  type OpeningKind,
} from './floorplan-openings';
import type { Vec3 } from './floorplan';

/** Une boîte de la maquette, par ses huit coins ; tournée de `angle` (`rotation.y`) autour de `about` (x, z). */
function box(name: string, min: Vec3, max: Vec3, turn?: { angle: number; about: [number, number] }): ModelNode {
  const corners: number[] = [];
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        const [px, pz] = turn ? rotate([x, z], turn.about, turn.angle) : [x, z];
        corners.push(px, y, pz);
      }
  return modelNode(name, corners);
}

/** Un point (x, z) tourné autour d'un axe vertical, comme le fait `rotation.y` de three.js. */
function rotate([x, z]: [number, number], [px, pz]: [number, number], angle: number): [number, number] {
  const dx = x - px;
  const dz = z - pz;
  return [px + dx * Math.cos(angle) + dz * Math.sin(angle), pz - dx * Math.sin(angle) + dz * Math.cos(angle)];
}

describe('parseNodeName', () => {
  it('reads the family, the component and the repeat of an ExportToHASS name', () => {
    expect(parseNodeName('Porte_en_bois_1')).toEqual({ level: '', family: 'Porte_en_bois', component: 1, k: 0 });
    expect(parseNodeName('Porte_en_bois_5_4')).toEqual({ level: '', family: 'Porte_en_bois', component: 5, k: 4 });
    expect(parseNodeName('Appareil_technologique_16')).toEqual({ level: '', family: 'Appareil_technologique', component: 16, k: 0 });
  });

  it('keeps the level of a house with several floors apart', () => {
    expect(parseNodeName('lvl001Porte_Cuisine_2')).toEqual({ level: 'lvl001', family: 'Porte_Cuisine', component: 2, k: 0 });
  });

  it('gives no family to an object that had no valid name', () => {
    expect(parseNodeName('1')).toEqual({ level: '', family: '', component: 1, k: 0 });
    expect(parseNodeName('6_3')).toEqual({ level: '', family: '', component: 6, k: 3 });
  });

  it('takes a name from another tool as a family of one component', () => {
    expect(parseNodeName('Door')).toEqual({ level: '', family: 'Door', component: 0, k: 0 });
  });
});

describe('structureOf', () => {
  it('recognises walls and floors, with the number of a wall', () => {
    expect(structureOf('wall_12_3')).toEqual({ type: 'wall', id: '12' });
    expect(structureOf('lvl001wall_2_6')).toEqual({ type: 'wall', id: '2' });
    expect(structureOf('room_0_1')).toEqual({ type: 'room', id: '0' });
    expect(structureOf('Porte_en_bois_1')).toBeNull();
  });
});

describe('guessOpeningKind', () => {
  it('reads the type from the first word of the naming scheme', () => {
    const cases: [string, OpeningKind | null][] = [
      ['Porte_Cuisine', 'door'],
      ['Baie_Salon', 'sliding'],
      ['Fenetre_Chambre', 'window'],
      ['Volet_Salon', 'shutter'],
      ['Garage', 'garage'],
    ];
    for (const [name, kind] of cases) expect(guessOpeningKind(name)).toBe(kind);
  });

  it('understands catalogue names and English, the most specific word first', () => {
    expect(guessOpeningKind('Porte_coulissante_grise')).toBe('sliding');
    expect(guessOpeningKind('Porte_en_bois')).toBe('door');
    expect(guessOpeningKind('Porte_Garage')).toBe('garage');
    expect(guessOpeningKind('PorteFenetre_Sejour')).toBe('window');
    expect(guessOpeningKind('Sliding_Door')).toBe('sliding');
    expect(guessOpeningKind('Front_door')).toBe('door');
  });

  it('does not take a coat stand or a TV for a door', () => {
    expect(guessOpeningKind('Portemanteau')).toBeNull();
    expect(guessOpeningKind('Appareil_technologique')).toBeNull();
  });
});

describe('modelNode', () => {
  it('keeps the box, and each point on the ground once', () => {
    const node = box('leaf', [0, 0, 0], [80, 200, 4]);
    expect(node.min).toEqual([0, 0, 0]);
    expect(node.max).toEqual([80, 200, 4]);
    expect(node.footprint).toHaveLength(4);
  });
});

describe('detectOpenings', () => {
  const wall = (id: number, min: Vec3, max: Vec3) => [1, 2, 3, 4].map(face => box(`wall_${id}_${face}`, min, max));

  it('groups the components of each object, apart from a wardrobe against its frame', () => {
    const { openings } = detectOpenings([
      box('Porte_Cuisine_1', [100, 0, 0], [200, 210, 6]),
      box('Porte_Cuisine_2', [108, 1, 2], [192, 200, 4]),
      box('Armoire_1', [200, 0, 0], [300, 220, 60]),
    ]);
    expect(openings.map(o => [o.family, o.nodes])).toEqual([
      ['Porte_Cuisine', ['Porte_Cuisine_1', 'Porte_Cuisine_2']],
      ['Armoire', ['Armoire_1']],
    ]);
  });

  it('tells apart the objects of one name, in the order of the file', () => {
    const { openings, families } = detectOpenings([
      box('Porte_en_bois_1', [0, 0, 0], [100, 210, 6]),
      box('Porte_en_bois_2', [8, 0, 2], [92, 200, 4]),
      box('Porte_en_bois_1_1', [500, 0, 0], [600, 210, 6]),
      box('Porte_en_bois_2_1', [508, 0, 2], [592, 200, 4]),
    ]);
    expect(openings.map(o => [o.id, o.index])).toEqual([
      ['Porte_en_bois_1', 1],
      ['Porte_en_bois_1_1', 2],
    ]);
    expect(families).toEqual([{ name: 'Porte_en_bois', count: 2, inWall: false, kind: 'door', size: [100, 210] }]);
  });

  it('splits two objects of one name that touch, by their repeat', () => {
    const { openings } = detectOpenings([
      box('Fenetre_1', [0, 100, 0], [100, 200, 6]),
      box('Fenetre_2', [5, 105, 2], [95, 195, 4]),
      box('Fenetre_1_1', [100, 100, 0], [200, 200, 6]),
      box('Fenetre_2_1', [105, 105, 2], [195, 195, 4]),
    ]);
    expect(openings.map(o => o.nodes)).toEqual([
      ['Fenetre_1', 'Fenetre_2'],
      ['Fenetre_1_1', 'Fenetre_2_1'],
    ]);
  });

  it('leaves walls and floors out, and counts the unnamed objects set in a wall', () => {
    const result = detectOpenings([
      ...wall(0, [0, 0, -5], [1000, 250, 5]),
      box('room_0_1', [0, 0, 0], [1000, 0, 800]),
      // Une fenêtre sans nom valide, dans le mur ; un canapé sans nom, dans la pièce.
      box('1', [100, 90, -3], [200, 220, 3]),
      box('2', [105, 95, -1], [195, 215, 1]),
      box('1_1', [300, 0, 200], [500, 80, 290]),
      box('Porte_Salon_1', [600, 0, -3], [700, 210, 3]),
    ]);
    expect(result.openings.map(o => [o.family, o.inWall])).toEqual([
      ['', true],
      ['', false],
      ['Porte_Salon', true],
    ]);
    expect(result.unnamed).toBe(1);
    expect(result.cm).toBe(1);
    expect(result.center).toEqual([500, 397.5]);
  });

  it('works out the unit: a model in metres has a hundredth for a centimetre', () => {
    const { cm } = detectOpenings([box('wall_0_1', [0, 0, 0], [12, 2.5, 0.2]), box('room_0_1', [0, 0, 0], [12, 0, 9])]);
    expect(cm).toBe(0.01);
  });
});

// ── Sur une vraie maquette : la maison de tests/dashboard/fixtures ───────────

/** Les nœuds d'un `.glb` d'ExportToHASS (à plat, sans transformation), comme les lit le chargement. */
function readGlb(file: string): ModelNode[] {
  const buffer = readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = buffer.subarray(20 + jsonLength + 8);
  return json.scenes[0].nodes.map((index: number) => {
    const node = json.nodes[index];
    const positions: number[] = [];
    for (const primitive of json.meshes[node.mesh].primitives) {
      const accessor = json.accessors[primitive.attributes.POSITION];
      const view = json.bufferViews[accessor.bufferView];
      const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const stride = view.byteStride ?? 12;
      for (let i = 0; i < accessor.count; i++) {
        for (let c = 0; c < 3; c++) positions.push(bin.readFloatLE(offset + i * stride + c * 4));
      }
    }
    return modelNode(node.name, positions);
  });
}

describe('the house of the fixtures (ExportToHASS)', () => {
  const nodes = readGlb(path.resolve(__dirname, '../../tests/dashboard/fixtures/home.glb'));
  const model = detectOpenings(nodes);
  /** L'objet qui contient ce nœud. */
  const opening = (node: string) => model.openings.find(o => o.nodes.includes(node))!;

  it('finds the families set in the walls, and the openings left without a name', () => {
    expect(model.cm).toBe(1);
    expect(model.families.map(f => [f.name, f.count, f.inWall, f.kind])).toEqual([
      ['Porte_en_bois', 5, true, 'door'],
      ['Porte_coulissante_grise', 1, true, 'sliding'],
      ['Appareil_technologique', 1, false, null],
    ]);
    // La porte d'entrée, la baie, quatre fenêtres, deux petites ; pas le canapé.
    expect(model.unnamed).toBe(8);
    expect(opening('1_8').inWall).toBe(false);
  });

  it('gathers the five wooden doors, five components each', () => {
    const doors = model.openings.filter(o => o.family === 'Porte_en_bois');
    expect(doors.map(d => d.id)).toEqual([
      'Porte_en_bois_1',
      'Porte_en_bois_1_1',
      'Porte_en_bois_1_2',
      'Porte_en_bois_1_3',
      'Porte_en_bois_1_4',
    ]);
    expect(doors.every(d => d.nodes.length === 5)).toBe(true);
    expect(doors[0].size).toEqual([98, 210]);
  });
});

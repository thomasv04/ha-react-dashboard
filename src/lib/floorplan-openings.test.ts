import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  detectOpenings,
  familyKind,
  guessOpeningKind,
  modelNode,
  motionAt,
  normalizeOpenings,
  openingMotion,
  parseNodeName,
  structureOf,
  type ModelNode,
  type Motion,
  type OpeningKind,
} from './floorplan-openings';
import { SWING, type Vec3 } from './floorplan';

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

/** Maison supposée au sud (z croissants) des ouvertures de test : l'intérieur. */
const INSIDE = { cm: 1, center: [100, 400] as [number, number] };

const swingOf = (motion: Motion) => {
  if (motion.type !== 'swing') throw new Error(`swing attendu, ${motion.type} obtenu`);
  return motion;
};
const slideOf = (motion: Motion) => {
  if (motion.type !== 'slide') throw new Error(`slide attendu, ${motion.type} obtenu`);
  return motion;
};

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

describe('openingMotion — a swinging door', () => {
  /** Une porte de 84 cm dans un cadre de 100, dans un mur le long des x. */
  const door = (leaf: ModelNode, ...extra: ModelNode[]) => [box('Porte_1', [100, 0, 2], [200, 210, 8]), leaf, ...extra];
  const LEAF: [Vec3, Vec3] = [
    [108, 1, 4],
    [192, 200, 6],
  ];
  const hinges = [20, 100, 180].map((y, i) => box(`Porte_${3 + i}`, [190, y, 6], [193, y + 4, 7]));
  const handle = box('Porte_6', [110, 95, 1], [116, 100, 9]);

  it('turns a closed leaf on its hinges, and opens it where they stick out', () => {
    const [part] = openingMotion(door(box('Porte_2', ...LEAF), ...hinges, handle), 'door', INSIDE);
    const motion = swingOf(part.motion);
    expect(part.nodes.sort()).toEqual(['Porte_2', 'Porte_3', 'Porte_4', 'Porte_5', 'Porte_6']);
    expect(motion.pivot[0]).toBeCloseTo(192);
    expect(motion.pivot[1]).toBeCloseTo(5);
    expect(motion.closed).toBeCloseTo(0);
    // L'arête libre part vers les z croissants, d'un peu moins d'un angle droit.
    const free = rotate([108, 5], motion.pivot, motion.open);
    expect(free[1]).toBeGreaterThan(5 + 80);
    expect(Math.abs(motion.open)).toBeCloseTo(SWING);
  });

  it('puts the hinges opposite the handle when there are none', () => {
    const [part] = openingMotion(door(box('Porte_2', ...LEAF), handle), 'door', INSIDE);
    expect(swingOf(part.motion).pivot[0]).toBeCloseTo(192);
  });

  it('opens towards the inside of the house when nothing says where', () => {
    const outside = { ...INSIDE, center: [100, -400] as [number, number] };
    const motion = swingOf(openingMotion(door(box('Porte_2', ...LEAF), handle), 'door', outside)[0].motion);
    expect(rotate([108, 5], motion.pivot, motion.open)[1]).toBeLessThan(-70);
  });

  it('closes a leaf modelled ajar, and opens it on the same side', () => {
    // Le battant, entrouvert de 50° vers les z croissants.
    const ajar = { angle: 0.87, about: [192, 5] as [number, number] };
    const [part] = openingMotion(door(box('Porte_2', ...LEAF, ajar)), 'door', { ...INSIDE, center: [100, -400] });
    const motion = swingOf(part.motion);
    expect(motion.pivot[0]).toBeCloseTo(192, 0);
    expect(motion.pivot[1]).toBeCloseTo(5, 0);
    expect(motion.closed).toBeCloseTo(-0.87, 2);
    // Fermé, l'arête libre revient dans le mur ; ouvert, elle repart du même côté.
    const free = rotate([108, 5], ajar.about, ajar.angle);
    expect(rotate(free, motion.pivot, motion.closed)[1]).toBeCloseTo(5, 0);
    expect(rotate(free, motion.pivot, motion.open)[1]).toBeGreaterThan(80);
    expect(motion.open - motion.closed).toBeCloseTo(SWING);
  });

  it('turns the other way, or on the other edge, when corrected', () => {
    const nodes = door(box('Porte_2', ...LEAF), ...hinges, handle);
    const flipped = swingOf(openingMotion(nodes, 'door', { ...INSIDE, flip: true })[0].motion);
    expect(rotate([108, 5], flipped.pivot, flipped.open)[1]).toBeLessThan(-70);
    const other = swingOf(openingMotion(nodes, 'door', { ...INSIDE, hinge: true })[0].motion);
    expect(other.pivot[0]).toBeCloseTo(108);
  });

  it('finds nothing to move in a door that is all one piece', () => {
    expect(openingMotion([box('Porte_1', [100, 0, 2], [200, 210, 8])], 'door', INSIDE)).toEqual([]);
  });

  it('leaves shutters and garage doors still, for now', () => {
    const nodes = door(box('Porte_2', ...LEAF), ...hinges);
    expect(openingMotion(nodes, 'shutter', INSIDE)).toEqual([]);
    expect(openingMotion(nodes, 'garage', INSIDE)).toEqual([]);
  });
});

describe('openingMotion — a window with two sashes', () => {
  const window = [
    box('Fenetre_1', [0, 90, 0], [200, 220, 8]),
    box('Fenetre_2', [5, 95, 3], [100, 215, 5]),
    box('Fenetre_3', [100, 95, 3], [195, 215, 5]),
    box('Fenetre_4', [15, 105, 4], [90, 205, 4.2]),
    box('Fenetre_5', [3, 110, 5], [6, 114, 6]),
    box('Fenetre_6', [3, 200, 5], [6, 204, 6]),
    box('Fenetre_7', [194, 110, 5], [197, 114, 6]),
    box('Fenetre_8', [194, 200, 5], [197, 204, 6]),
    // La poignée, côté intérieur seulement.
    box('Fenetre_9', [92, 150, 5], [95, 160, 7]),
  ];

  it('turns each sash on the hinges along its jamb, both to the side of the handle', () => {
    const parts = openingMotion(window, 'window', { ...INSIDE, center: [100, -400] });
    expect(parts).toHaveLength(2);
    const [left, right] = parts.map(p => swingOf(p.motion)).sort((a, b) => a.pivot[0] - b.pivot[0]);
    expect(left.pivot[0]).toBeCloseTo(5);
    expect(right.pivot[0]).toBeCloseTo(195);
    expect(rotate([100, 4], left.pivot, left.open)[1]).toBeGreaterThan(50);
    expect(rotate([100, 4], right.pivot, right.open)[1]).toBeGreaterThan(50);
    // La vitre suit son vantail, la poignée aussi.
    expect(parts.find(p => p.nodes.includes('Fenetre_2'))!.nodes).toEqual(expect.arrayContaining(['Fenetre_4', 'Fenetre_9']));
  });
});

describe('openingMotion — a sliding bay', () => {
  const frame = box('Baie_1', [0, 0, 0], [240, 220, 10]);

  it('slides the first panel over its neighbour', () => {
    const nodes = [frame, box('Baie_2', [5, 2, 2], [125, 215, 4]), box('Baie_3', [115, 2, 5], [235, 215, 7])];
    const [part] = openingMotion(nodes, 'sliding', INSIDE);
    const motion = slideOf(part.motion);
    expect(part.nodes).toEqual(['Baie_2']);
    expect(motion.axis).toEqual([1, 0]);
    expect(motion.closed).toBe(0);
    expect(motion.open).toBeCloseTo(110);
    const back = openingMotion(nodes, 'sliding', { ...INSIDE, flip: true })[0];
    expect(back.nodes).toEqual(['Baie_3']);
    expect(slideOf(back.motion).open).toBeCloseTo(-110);
  });

  it('brings together the panels of a bay modelled open, to close it', () => {
    const nodes = [frame, box('Baie_2', [10, 2, 2], [70, 215, 4]), box('Baie_3', [170, 2, 2], [230, 215, 4])];
    const parts = openingMotion(nodes, 'sliding', INSIDE).map(p => [p.nodes[0], slideOf(p.motion).closed, slideOf(p.motion).open]);
    expect(parts).toEqual([
      ['Baie_2', 50, 0],
      ['Baie_3', -50, 0],
    ]);
  });
});

describe('motionAt', () => {
  it('goes from closed to open', () => {
    const motion: Motion = { type: 'slide', axis: [1, 0], closed: 50, open: 0 };
    expect(motionAt(motion, 0)).toBe(50);
    expect(motionAt(motion, 0.5)).toBe(25);
    expect(motionAt(motion, 1)).toBe(0);
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
  const byName = new Map(nodes.map(n => [n.name, n]));
  /** L'objet qui contient ce nœud, et le mouvement de ses parties. */
  const opening = (node: string) => model.openings.find(o => o.nodes.includes(node))!;
  const motion = (node: string, kind: OpeningKind, options: { flip?: boolean; hinge?: boolean } = {}) =>
    openingMotion(
      opening(node).nodes.map(name => byName.get(name)!),
      kind,
      { cm: model.cm, center: model.center, ...options }
    );

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

  it('closes each wooden door modelled ajar, on the thin rod of its hinges', () => {
    for (const k of ['', '_1', '_2', '_3', '_4']) {
      const [part] = motion(`Porte_en_bois_1${k}`, 'door');
      const swing = swingOf(part.motion);
      // Le battant, sa poignée et sa rosace tournent ; le cadre reste.
      expect(part.nodes).toEqual(expect.arrayContaining([`Porte_en_bois_5${k}`, `Porte_en_bois_3${k}`, `Porte_en_bois_4${k}`]));
      expect(part.nodes).not.toContain(`Porte_en_bois_1${k}`);
      const rod = byName.get(`Porte_en_bois_2${k}`)!;
      expect(Math.hypot(swing.pivot[0] - (rod.min[0] + rod.max[0]) / 2, swing.pivot[1] - (rod.min[2] + rod.max[2]) / 2)).toBeLessThan(4);
      // Entrouverte d'un peu moins de 60°.
      expect(Math.abs(swing.closed)).toBeGreaterThan(0.9);
      expect(Math.abs(swing.closed)).toBeLessThan(1.1);
      expect(Math.abs(swing.open - swing.closed)).toBeCloseTo(SWING);
    }
  });

  it('turns the front door on its hinges, opposite the knob, into the house', () => {
    const [part] = motion('9', 'door');
    const swing = swingOf(part.motion);
    expect(part.nodes).toEqual(expect.arrayContaining(['9', '8', '10', '6']));
    expect(swing.pivot[1]).toBeGreaterThan(495);
    expect(swing.closed).toBeCloseTo(0);
    // Le mur est en x = 1620 ; la maison, vers les x décroissants.
    const free = rotate([1622, 420], swing.pivot, swing.open);
    expect(free[0]).toBeLessThan(1560);
  });

  it('turns both sashes of a window on their hinges, into the house', () => {
    const parts = motion('6_2', 'window');
    expect(parts).toHaveLength(2);
    const pivots = parts.map(p => swingOf(p.motion).pivot[0]).sort((a, b) => a - b);
    expect(pivots[0]).toBeLessThan(175);
    expect(pivots[1]).toBeGreaterThan(352);
    for (const p of parts) {
      const swing = swingOf(p.motion);
      expect(rotate([264, 3], swing.pivot, swing.open)[1]).toBeGreaterThan(40);
    }
  });

  it('turns the small window on the side of its hinges, opposite its handle', () => {
    const [part] = motion('6_6', 'window');
    const swing = swingOf(part.motion);
    expect(swing.pivot[1]).toBeLessThan(732);
    expect(rotate([1621, 780], swing.pivot, swing.open)[0]).toBeLessThan(1590);
  });

  it('opens every window, and the front door, into the house', () => {
    // Vers l'intérieur : la maison s'étend des x 0 à 1628, des z 0 à 1384.
    const inwards: Record<string, [number, number]> = {
      '9': [-1, 0],
      '6_2': [0, 1],
      '6_3': [0, 1],
      '6_4': [0, 1],
      '6_5': [-1, 0],
      '6_6': [-1, 0],
      '6_7': [1, 0],
    };
    for (const [node, inward] of Object.entries(inwards)) {
      for (const part of motion(node, node === '9' ? 'door' : 'window')) {
        const swing = swingOf(part.motion);
        const leaf = byName.get(part.nodes[0])!;
        const middle: [number, number] = [(leaf.min[0] + leaf.max[0]) / 2, (leaf.min[2] + leaf.max[2]) / 2];
        const moved = rotate(middle, swing.pivot, swing.open);
        expect((moved[0] - middle[0]) * inward[0] + (moved[1] - middle[1]) * inward[1], node).toBeGreaterThan(20);
      }
    }
  });

  it('slides a sash of the bay over the other', () => {
    const [part] = motion('4_1', 'sliding');
    const slide = slideOf(part.motion);
    expect(part.nodes).toEqual(expect.arrayContaining(['8_1', '6_1']));
    expect(Math.abs(slide.axis[1])).toBeCloseTo(1);
    expect(Math.abs(slide.open)).toBeGreaterThan(105);
    expect(Math.abs(slide.open)).toBeLessThan(121);
  });

  it('closes the grey sliding door, modelled open, by bringing its panels together', () => {
    const parts = motion('Porte_coulissante_grise_1', 'sliding');
    expect(parts).toHaveLength(2);
    const [left, right] = parts.map(p => ({ nodes: p.nodes, slide: slideOf(p.motion) })).sort((a, b) => b.slide.closed - a.slide.closed);
    expect(left.nodes.sort()).toEqual(['Porte_coulissante_grise_7', 'Porte_coulissante_grise_8']);
    expect(right.nodes.sort()).toEqual(['Porte_coulissante_grise_4', 'Porte_coulissante_grise_5']);
    expect(left.slide.closed).toBeCloseTo(48, 0);
    expect(right.slide.closed).toBeCloseTo(-48, 0);
    expect(left.slide.open).toBe(0);
  });
});

describe('normalizeOpenings', () => {
  it('keeps what is readable, and drops the rest without failing', () => {
    expect(
      normalizeOpenings({
        kinds: { Porte_en_bois: 'door', Canape: 'none', Armoire: 'wardrobe' },
        links: [
          { node: 'Porte_en_bois_1', entityId: 'binary_sensor.porte', flip: true, hinge: 'yes' },
          { node: 3, entityId: 'binary_sensor.x' },
          null,
        ],
      })
    ).toEqual({
      kinds: { Porte_en_bois: 'door', Canape: 'none' },
      links: [{ node: 'Porte_en_bois_1', entityId: 'binary_sensor.porte', flip: true }],
    });
    expect(normalizeOpenings(undefined)).toEqual({ kinds: {}, links: [] });
  });
});

describe('familyKind', () => {
  it('takes the type chosen by hand, then the one guessed from the name', () => {
    expect(familyKind('Porte_en_bois', {})).toBe('door');
    expect(familyKind('Porte_en_bois', { Porte_en_bois: 'window' })).toBe('window');
    expect(familyKind('Porte_en_bois', { Porte_en_bois: 'none' })).toBeNull();
    expect(familyKind('Armoire', { Armoire: 'door' })).toBe('door');
    expect(familyKind('', {})).toBeNull();
  });
});

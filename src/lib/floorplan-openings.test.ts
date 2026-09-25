import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  detectOpenings,
  familyKind,
  furnitureNodes,
  guessOpeningKind,
  levelOf,
  linkCandidates,
  modelLevels,
  modelNode,
  motionAt,
  normalizeOpenings,
  openingLabel,
  openingMotion,
  parseNodeName,
  structureOf,
  suggestLinks,
  typedOpenings,
  wallTop,
  type LinkCandidate,
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

  it('keeps whole an object whose name ends in a number, and numbers two of that name', () => {
    // `Fenetre_sal_1` dans Sweet Home 3D : l'export en tire `Fenetre_sal_1_1`,
    // `Fenetre_sal_1_2`… ; la seconde du même nom, `Fenetre_sal_1_1_1`…
    const { openings, families } = detectOpenings([
      box('Fenetre_sal_1_1', [0, 90, 0], [200, 220, 8]),
      box('Fenetre_sal_1_2', [5, 95, 3], [100, 215, 5]),
      box('Fenetre_sal_1_3', [100, 95, 3], [195, 215, 5]),
      box('Fenetre_sal_1_1_1', [500, 90, 0], [700, 220, 8]),
      box('Fenetre_sal_1_2_1', [505, 95, 3], [600, 215, 5]),
    ]);
    expect(openings.map(o => [o.id, o.family, o.index, o.nodes.length])).toEqual([
      ['Fenetre_sal_1_1', 'Fenetre_sal_1', 1, 3],
      ['Fenetre_sal_1_1_1', 'Fenetre_sal_1', 2, 2],
    ]);
    expect(families.map(f => [f.name, f.count, f.kind])).toEqual([['Fenetre_sal_1', 2, 'window']]);
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

  it('keeps centimetres for a house with its garden, 70 m across', () => {
    const { cm } = detectOpenings([box('wall_0_1', [0, 0, 0], [5000, 250, 20]), box('room_0_1', [0, 0, 0], [5000, 0, 5000])]);
    expect(cm).toBe(1);
  });
});

describe('modelLevels', () => {
  it('reads the floors of a house with levels, from the lowest', () => {
    const nodes = [
      box('lvl001room_1_1', [0, 260, 0], [500, 262, 400]),
      box('lvl001wall_3_1', [0, 262, 0], [500, 510, 10]),
      box('lvl001Fenetre_Etage_1', [100, 350, 0], [200, 450, 8]),
      box('lvl000room_0_1', [0, -2, 0], [500, 0, 400]),
      box('lvl000wall_1_1', [0, 0, 0], [500, 250, 10]),
    ];
    expect(modelLevels(nodes)).toEqual([
      { id: 'lvl000', floor: -2, top: 250 },
      { id: 'lvl001', floor: 260, top: 510 },
    ]);
    expect(levelOf('lvl001Fenetre_Etage_1')).toBe('lvl001');
  });

  it('finds none in a house on one level', () => {
    expect(modelLevels([box('room_0_1', [0, -2, 0], [500, 0, 400]), box('wall_1_1', [0, 0, 0], [500, 250, 10])])).toEqual([]);
  });
});

describe('wallTop', () => {
  it('finds the top of the walls, whatever rises above them', () => {
    const nodes = [
      box('wall_0_1', [0, 0, 0], [500, 250, 10]),
      box('wall_1_1', [0, 0, 0], [10, 280, 400]),
      // Un conduit sans nom, qui traverse le plafond.
      box('3_6', [100, 152, 100], [120, 344, 120]),
    ];
    expect(wallTop(nodes)).toBe(280);
    expect(wallTop([box('Canape_1', [0, 0, 0], [200, 80, 90])])).toBeNull();
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
});

describe('openingMotion — a roller shutter, a garage door', () => {
  const rollOf = (motion: Motion) => {
    if (motion.type !== 'roll') throw new Error(`roll attendu, ${motion.type} obtenu`);
    return motion;
  };

  it('rolls the apron of a shutter up under its box, between its guides', () => {
    const shutter = [
      box('Volet_1', [96, 200, 405], [164, 215, 420]),
      box('Volet_2', [96, 100, 405], [100, 200, 410]),
      box('Volet_3', [160, 100, 405], [164, 200, 410]),
      box('Volet_4', [100, 100, 406], [160, 200, 408]),
    ];
    const [part] = openingMotion(shutter, 'shutter', INSIDE);
    const motion = rollOf(part.motion);
    expect(part.nodes).toEqual(['Volet_4']);
    expect(motion.top).toBe(200);
    expect(motion.closed).toBeCloseTo(1);
    expect(motion.open).toBeLessThan(0.1);
  });

  it('brings down to the floor an apron modelled half rolled up', () => {
    const shutter = [
      box('Volet_1', [96, 200, 405], [164, 215, 420]),
      box('Volet_2', [96, 0, 405], [100, 200, 410]),
      box('Volet_3', [160, 0, 405], [164, 200, 410]),
      box('Volet_4', [100, 100, 406], [160, 200, 408]),
    ];
    const motion = rollOf(openingMotion(shutter, 'shutter', INSIDE)[0].motion);
    expect(motion.closed).toBeCloseTo(2);
  });

  it('rolls up the panel of a garage door that has no frame, with its handle', () => {
    const garage = [box('Garage_1', [-3, 0, 152], [3, 215, 328]), box('Garage_2', [3, 90, 235], [5, 95, 245])];
    const [part] = openingMotion(garage, 'garage', INSIDE);
    expect(part.nodes).toEqual(['Garage_1', 'Garage_2']);
    expect(rollOf(part.motion).top).toBe(215);
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

describe('openingLabel and typedOpenings', () => {
  const nodes = [
    box('Porte_en_bois_1', [0, 0, 0], [100, 210, 6]),
    box('Porte_en_bois_1_1', [500, 0, 0], [600, 210, 6]),
    box('Porte_Entree_1', [900, 0, 0], [1000, 210, 6]),
    box('Armoire_1', [0, 0, 300], [100, 220, 360]),
  ];
  const model = detectOpenings(nodes);

  it('numbers the objects of a family only when it has several', () => {
    expect(model.openings.map(o => openingLabel(o, model.families))).toEqual([
      'Porte_en_bois · 1',
      'Porte_en_bois · 2',
      'Porte_Entree',
      'Armoire',
    ]);
  });

  it('keeps the objects of the families that have a type', () => {
    expect(typedOpenings(model, {}).map(o => o.id)).toEqual(['Porte_en_bois_1', 'Porte_en_bois_1_1', 'Porte_Entree_1']);
    expect(typedOpenings(model, { Porte_en_bois: 'none', Armoire: 'door' }).map(o => o.id)).toEqual(['Porte_Entree_1', 'Armoire_1']);
  });
});

describe('suggestLinks', () => {
  const model = detectOpenings([
    box('Porte_Entree_1', [0, 0, 0], [100, 210, 6]),
    box('Porte_Chambre_1', [200, 0, 0], [300, 210, 6]),
    box('Volet_Chambre_1', [400, 100, 0], [500, 200, 6]),
    box('Porte_en_bois_1', [600, 0, 0], [700, 210, 6]),
    box('Porte_en_bois_1_1', [800, 0, 0], [900, 210, 6]),
  ]);
  const entities: LinkCandidate[] = [
    { entityId: 'binary_sensor.contact_42', name: "Porte d'entrée", deviceClass: 'door' },
    { entityId: 'binary_sensor.fenetre_chambre', deviceClass: 'window' },
    { entityId: 'cover.volet_chambre', deviceClass: 'shutter' },
    { entityId: 'cover.volet_chambre_invites', deviceClass: 'shutter' },
    { entityId: 'binary_sensor.porte_en_bois', deviceClass: 'door' },
  ];

  it('links an opening to the entity named like it, able to move it', () => {
    expect(suggestLinks(model, {}, [], entities)).toEqual([
      // Par son nom, accents et apostrophe compris.
      { node: 'Porte_Entree_1', entityId: 'binary_sensor.contact_42' },
      // Le volet de la chambre, pas celui de la chambre d'invités.
      { node: 'Volet_Chambre_1', entityId: 'cover.volet_chambre' },
    ]);
    // Porte_Chambre : un contact de fenêtre ne meut pas une porte. Porte_en_bois × 2 : laquelle ?
  });

  it('proposes nothing for what is already linked', () => {
    const links = [{ node: 'Volet_Chambre_1', entityId: 'cover.volet_salon' }];
    const taken = [{ node: 'Porte_Chambre_1', entityId: 'binary_sensor.contact_42' }];
    expect(suggestLinks(model, {}, links, entities).map(s => s.node)).toEqual(['Porte_Entree_1']);
    expect(suggestLinks(model, {}, taken, entities).map(s => s.node)).toEqual(['Volet_Chambre_1']);
  });

  it('keeps only contacts and covers among the entities of the house', () => {
    const candidates = linkCandidates({
      'binary_sensor.porte_entree': { attributes: { device_class: 'door', friendly_name: "Porte d'entrée" } },
      'binary_sensor.couloir_mouvement': { attributes: { device_class: 'motion' } },
      'cover.volet_salon': { attributes: {} },
      'light.salon': { attributes: {} },
    });
    expect(candidates.map(c => c.entityId)).toEqual(['binary_sensor.porte_entree', 'cover.volet_salon']);
    expect(candidates[0].name).toBe("Porte d'entrée");
  });
});

// ── Sur une maquette .glb : celle des tests de bout en bout ─────────────────

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

describe('the house with levels of the end-to-end tests (scripts/make-openings-glb.ts)', () => {
  it('holds a ground floor and a floor above it', () => {
    const { levels } = detectOpenings(readGlb(path.resolve(__dirname, '../../tests/dashboard/fixtures/levels.glb')));
    expect(levels).toEqual([
      { id: 'lvl000', floor: -2, top: 250 },
      { id: 'lvl001', floor: 260, top: 512 },
    ]);
  });
});

describe('the synthetic model of the end-to-end tests (scripts/make-openings-glb.ts)', () => {
  const nodes = readGlb(path.resolve(__dirname, '../../tests/dashboard/fixtures/openings.glb'));
  const model = detectOpenings(nodes);
  const byName = new Map(nodes.map(n => [n.name, n]));
  const motion = (id: string, kind: OpeningKind) =>
    openingMotion(
      model.openings.find(o => o.id === id)!.nodes.map(name => byName.get(name)!),
      kind,
      { cm: model.cm, center: model.center }
    );

  it('holds its openings, a sofa, and one window to rename', () => {
    expect(model.families.map(f => [f.name, f.inWall, f.kind])).toEqual([
      ['Porte_Cuisine', true, 'door'],
      ['Fenetre_Salon', true, 'window'],
      ['Baie_Salon', true, 'sliding'],
      ['Porte_Chambre', true, 'door'],
      // Dehors, devant sa fenêtre : pas dans le mur.
      ['Volet_Chambre', false, 'shutter'],
      ['Garage', true, 'garage'],
      ['Canape', false, null],
      ['Armoire_Chambre', false, null],
    ]);
    expect(model.unnamed).toBe(1);
  });

  it('lets its furniture fade rather than be cut — not the shutter, set outside the wall', () => {
    expect(furnitureNodes(model).sort()).toEqual(['1_1', '2_1', 'Armoire_Chambre_1', 'Armoire_Chambre_2', 'Canape_1', 'Canape_2']);
  });

  it('moves each of them the way it is modelled', () => {
    const door = swingOf(motion('Porte_Cuisine_1', 'door')[0].motion);
    expect(door.pivot[0]).toBeCloseTo(192);
    expect(rotate([108, 0], door.pivot, door.open)[1]).toBeGreaterThan(70);

    const sashes = motion('Fenetre_Salon_1', 'window').map(p => swingOf(p.motion).pivot[0]);
    expect(sashes.sort((a, b) => a - b).map(Math.round)).toEqual([355, 545]);

    const [bay] = motion('Baie_Salon_1', 'sliding');
    expect(bay.nodes.sort()).toEqual(['Baie_Salon_2', 'Baie_Salon_4']);
    expect(slideOf(bay.motion).open).toBeCloseTo(110);

    const ajar = swingOf(motion('Porte_Chambre_1', 'door')[0].motion);
    expect(ajar.pivot[0]).toBeCloseTo(492, 0);
    expect(ajar.closed).toBeCloseTo(0.87, 2);

    expect(motion('Volet_Chambre_1', 'shutter')[0].nodes).toEqual(['Volet_Chambre_3']);
    expect(motion('Garage_1', 'garage')[0].nodes).toEqual(['Garage_1', 'Garage_2']);
  });
});

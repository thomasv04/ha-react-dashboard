import { describe, it, expect } from 'vitest';
import {
  cloudiness,
  compassHeading,
  containSize,
  backSides,
  cutLimit,
  isCutAway,
  guessPartKind,
  isNightDimmed,
  isPresence,
  lightGlow,
  movePos,
  normalizeAnchor,
  normalizeParts,
  normalizeRooms,
  normalizePos,
  openness,
  partFrame,
  pointInPolygon,
  polygonCentroid,
  precipitation,
  resizePos,
  shortestTurn,
  skyColors,
  sunLighting,
  sunPosition,
  temperatureOf,
  thermalColor,
  DEFAULT_WIDGET_SIZE,
  type Vec3,
} from './floorplan';

type Sides = [number, number, number, number];

const RECT = { width: 1000, height: 500 };

describe('normalizePos', () => {
  it('keeps a valid position', () => {
    expect(normalizePos({ x: 20, y: 70 }, false)).toEqual({ x: 20, y: 70 });
  });

  it('centres an unreadable position instead of losing the element', () => {
    expect(normalizePos(undefined, false)).toEqual({ x: 50, y: 50 });
    expect(normalizePos({ x: '12', y: NaN }, false)).toEqual({ x: 50, y: 50 });
  });

  it('clamps into the plan', () => {
    expect(normalizePos({ x: -40, y: 180 }, false)).toEqual({ x: 0, y: 100 });
  });

  it('gives a widget a default size, and a chip none', () => {
    expect(normalizePos({ x: 50, y: 50 }, true)).toEqual({ x: 50, y: 50, ...DEFAULT_WIDGET_SIZE });
    expect(normalizePos({ x: 50, y: 50, w: 30, h: 20 }, false)).toEqual({ x: 50, y: 50 });
  });
});

describe('containSize', () => {
  it('fits the height when the area is wide', () => {
    expect(containSize(2000, 500, 2)).toEqual({ w: 1000, h: 500 });
  });

  it('fits the width when the area is tall', () => {
    expect(containSize(1000, 2000, 2)).toEqual({ w: 1000, h: 500 });
  });

  it('never goes below the minimum width (the area scrolls instead)', () => {
    expect(containSize(375, 700, 2)).toEqual({ w: 768, h: 384 });
  });
});

describe('movePos', () => {
  it('converts a pixel drag into % of the plan', () => {
    expect(movePos({ x: 50, y: 50 }, 100, -50, RECT)).toEqual({ x: 60, y: 40 });
  });

  it('lets a chip reach the edge, but keeps a widget whole inside the plan', () => {
    expect(movePos({ x: 90, y: 50 }, 500, 0, RECT).x).toBe(100);
    expect(movePos({ x: 50, y: 50, w: 20, h: 10 }, 5000, 5000, RECT)).toEqual({ x: 90, y: 95, w: 20, h: 10 });
  });
});

describe('resizePos', () => {
  it('grows from the bottom-right corner, top-left corner fixed', () => {
    // Boîte 20 × 10 dont le coin haut-gauche est en (40, 45).
    const next = resizePos({ x: 50, y: 50, w: 20, h: 10 }, 100, 50, RECT);
    expect(next).toEqual({ x: 55, y: 55, w: 30, h: 20 });
    expect(next.x - next.w! / 2).toBe(40);
    expect(next.y - next.h! / 2).toBe(45);
  });

  it('stops at the plan edge and at a minimum size', () => {
    expect(resizePos({ x: 50, y: 50, w: 20, h: 10 }, 9000, 0, RECT).w).toBe(60);
    expect(resizePos({ x: 50, y: 50, w: 20, h: 10 }, -9000, 0, RECT).w).toBe(4);
  });
});

describe('lightGlow', () => {
  it('uses the real colour of the lamp, and its brightness for opacity', () => {
    expect(lightGlow('on', { rgb_color: [255, 0, 0], brightness: 255 })).toEqual({ color: [255, 0, 0], opacity: 0.8 });
  });

  it('falls back to warm white for a dimmer-only lamp, and stays visible at minimum brightness', () => {
    const glow = lightGlow('on', { brightness: 0 });
    expect(glow?.color).toEqual([255, 196, 128]);
    expect(glow?.opacity).toBeCloseTo(0.25);
  });

  it('has no halo when off or unavailable', () => {
    expect(lightGlow('off', { rgb_color: [255, 0, 0] })).toBeNull();
    expect(lightGlow('unavailable', {})).toBeNull();
  });
});

describe('normalizeAnchor', () => {
  it('keeps a 3D point and rejects anything else', () => {
    expect(normalizeAnchor([1, 2.5, -3])).toEqual([1, 2.5, -3]);
    expect(normalizeAnchor([1, 2])).toBeUndefined();
    expect(normalizeAnchor([1, NaN, 3])).toBeUndefined();
    expect(normalizeAnchor('1,2,3')).toBeUndefined();
  });
});

describe('sunLighting', () => {
  const round = (v: number[]) => v.map(n => Math.round(n * 1000) / 1000 + 0);

  it('points the sun to the right compass direction', () => {
    expect(round(sunLighting({ azimuth: 0, elevation: 0 }).dir)).toEqual([0, 0, -1]); // nord : −z
    expect(round(sunLighting({ azimuth: 90, elevation: 0 }).dir)).toEqual([1, 0, 0]); // est : +x
    expect(round(sunLighting({ azimuth: 180, elevation: 90 }).dir)).toEqual([0, 1, 0]); // zénith
  });

  it('turns the sun with the model orientation', () => {
    expect(round(sunLighting({ azimuth: 0, elevation: 0 }, 90).dir)).toEqual([1, 0, 0]);
  });

  it('switches the sun off at night, and dims the ambient light through dusk', () => {
    const night = sunLighting({ azimuth: 300, elevation: -12 });
    expect(night.sun).toBe(0);
    expect(night.ambient).toBeCloseTo(0.15);
    expect(sunLighting({ azimuth: 180, elevation: 30 }).ambient).toBe(1);
    const dusk = sunLighting({ azimuth: 270, elevation: 2 }).ambient;
    expect(dusk).toBeGreaterThan(0.15);
    expect(dusk).toBeLessThan(1);
  });

  it('assumes an afternoon sun when sun.sun is missing', () => {
    expect(sunLighting(undefined).sun).toBeGreaterThan(1);
  });
});

describe('isNightDimmed', () => {
  it('dims after sunset unless disabled', () => {
    expect(isNightDimmed('below_horizon', undefined)).toBe(true);
    expect(isNightDimmed('below_horizon', false)).toBe(false);
    expect(isNightDimmed('above_horizon', true)).toBe(false);
    expect(isNightDimmed(undefined, true)).toBe(false);
  });
});

describe('normalizeParts', () => {
  const door = { id: 'p1', kind: 'door', entityId: 'binary_sensor.porte', a: [0, 0, 0], b: [1, 2, 0], side: -1, color: '#aa8855' };

  it('keeps a readable element', () => {
    expect(normalizeParts([door])).toEqual([door]);
  });

  it('drops what cannot be drawn, and repairs what can', () => {
    expect(normalizeParts('x')).toEqual([]);
    expect(normalizeParts([{ ...door, kind: 'trapdoor' }, { ...door, a: [0, 0] }, { ...door, entityId: 3 }, null])).toEqual([]);
    // Côté inconnu : celui par défaut ; couleur illisible : oubliée.
    const { color: _, ...uncolored } = door;
    expect(normalizeParts([{ ...door, side: 0, color: 'red' }])).toEqual([{ ...uncolored, side: 1 }]);
  });
});

describe('partFrame', () => {
  it('measures the opening and orients it along the first corner', () => {
    const f = partFrame([1, 0, 2], [1, 2.1, 0.8])!;
    expect(f.width).toBeCloseTo(1.2);
    expect(f.height).toBeCloseTo(2.1);
    expect(f.bottom).toBe(0);
    // Du premier coin vers le second : −z. La normale est à sa gauche (+x vu de dessus).
    expect(f.u).toEqual([0, 0, -1]);
    expect(f.n[0]).toBeCloseTo(1);
    expect(f.n[2]).toBeCloseTo(0);
  });

  it('gives the rotation that brings x onto the opening, and z onto its normal', () => {
    const { angle, u, n } = partFrame([0, 0, 0], [3, 1, 4])!;
    // Rotation de three.js autour de y : x → (cos θ, 0, −sin θ), z → (sin θ, 0, cos θ).
    expect([Math.cos(angle), -Math.sin(angle)]).toEqual([expect.closeTo(u[0]), expect.closeTo(u[2])]);
    expect([Math.sin(angle), Math.cos(angle)]).toEqual([expect.closeTo(n[0]), expect.closeTo(n[2])]);
  });

  it('refuses two corners too close to open anything', () => {
    expect(partFrame([0, 0, 0], [0, 2, 0])).toBeNull();
    expect(partFrame([0, 1, 0], [1, 1, 0])).toBeNull();
  });
});

describe('openness', () => {
  it('follows the position of a cover', () => {
    expect(openness('open', { current_position: 75 })).toBe(0.75);
    expect(openness('closed', { current_position: 0 })).toBe(0);
    expect(openness('open', { current_position: 140 })).toBe(1);
  });

  it('reads the state of a contact sensor, or of a cover without position', () => {
    expect(openness('on', {})).toBe(1);
    expect(openness('off', {})).toBe(0);
    expect(openness('opening', undefined)).toBe(1);
    expect(openness('closed', {})).toBe(0);
    expect(openness(undefined, undefined)).toBe(0);
  });
});

describe('guessPartKind', () => {
  it('guesses from the device class, then the domain', () => {
    expect(guessPartKind('cover.volet_salon', 'shutter')).toBe('shutter');
    expect(guessPartKind('cover.volet_salon', undefined)).toBe('shutter');
    expect(guessPartKind('cover.portail', 'gate')).toBe('door');
    expect(guessPartKind('cover.garage', 'garage')).toBe('garage');
    expect(guessPartKind('binary_sensor.garage', 'garage_door')).toBe('garage');
    expect(guessPartKind('binary_sensor.fenetre', 'window')).toBe('window');
    expect(guessPartKind('binary_sensor.porte', 'door')).toBe('door');
  });
});

describe('backSides', () => {
  it('keeps the two far walls when looking across a corner', () => {
    // Caméra en x+, z+ : les murs du fond sont ceux de x− et de z−.
    expect(backSides([10, 8, 10], [0, 0, 0])).toEqual([true, true, false, false]);
  });

  it('cuts the side walls when looking straight along them', () => {
    expect(backSides([0, 8, -10], [0, 0, 0])).toEqual([false, false, false, true]);
  });

  it('keeps every wall when looking straight down', () => {
    expect(backSides([2, 20, 2], [2, 0, 2])).toEqual([true, true, true, true]);
  });

  it('does not flicker around the threshold', () => {
    // Côté x− vu à 0,2 de profil : juste sous le seuil pour se lever, au-dessus pour rester debout.
    const camera: Vec3 = [2, 8, 9.8];
    expect(backSides(camera, [0, 0, 0])[0]).toBe(false);
    expect(backSides(camera, [0, 0, 0], [true, true, false, false])[0]).toBe(true);
  });
});

describe('cutLimit', () => {
  const cut = { height: 1, box: [-8, -5, 8, 5] as Sides, sides: [4, 4, 1, 1] as Sides, margin: 0.5 };

  it('lowers everything to the cut height, except along the far walls', () => {
    expect(cutLimit([0, 0, 0], cut)).toBe(1); // cloison au milieu
    expect(cutLimit([7.8, 0, 0], cut)).toBe(1); // mur de devant, x+
    expect(cutLimit([-7.8, 0, 0], cut)).toBe(4); // mur du fond, x−
    expect(cutLimit([0, 0, -4.7], cut)).toBe(4); // mur du fond, z−
  });

  it('follows a wall as it slides', () => {
    expect(cutLimit([-7.8, 0, 0], { ...cut, sides: [2.5, 4, 1, 1] })).toBe(2.5);
    expect(isCutAway([-7.8, 3, 0], { ...cut, sides: [2.5, 4, 1, 1] })).toBe(true);
    expect(isCutAway([-7.8, 2, 0], { ...cut, sides: [2.5, 4, 1, 1] })).toBe(false);
  });
});

describe('skyColors', () => {
  it('shows a starry night, and no stars by day', () => {
    expect(skyColors(-30)).toEqual({ top: '#070b1a', horizon: '#121a33', stars: 1 });
    expect(skyColors(40).stars).toBe(0);
  });

  it('warms the horizon around sunset', () => {
    expect(skyColors(-1)).toEqual({ top: '#22305c', horizon: '#d67856', stars: expect.closeTo(0.15) });
    // À mi-chemin entre le coucher (−1°) et l'heure dorée (5°).
    expect(skyColors(2).horizon).toBe('#e49568');
  });

  it('assumes an afternoon sky when sun.sun is missing', () => {
    expect(skyColors(undefined)).toEqual(skyColors(40));
  });
});

describe('cloudiness', () => {
  it('reads the weather state, in both spellings of partly cloudy', () => {
    expect(cloudiness('sunny')).toBe(0);
    expect(cloudiness('partlycloudy')).toBe(cloudiness('partly-cloudy'));
    expect(cloudiness('cloudy')).toBeGreaterThan(cloudiness('partlycloudy'));
    expect(cloudiness('pouring')).toBeGreaterThan(cloudiness('rainy'));
  });

  it('assumes a clear sky for an unknown or missing state', () => {
    expect(cloudiness('unavailable')).toBe(0);
    expect(cloudiness(undefined)).toBe(0);
  });
});

describe('sunPosition', () => {
  // Références : astral 2.2, la bibliothèque dont Home Assistant tire `sun.sun`,
  // sans réfraction.
  const cases: [string, string, number, number, number, number][] = [
    ["Paris, solstice d'été, midi", '2024-06-21T12:00:00Z', 48.8566, 2.3522, 64.538, 183.995],
    ["Paris, solstice d'hiver, matin", '2024-12-21T10:00:00Z', 48.8566, 2.3522, 13.726, 154.407],
    ['Paris, équinoxe, nuit', '2024-03-20T20:00:00Z', 48.8566, 2.3522, -19.317, 294.145],
    ["Paris, soir d'été", '2024-07-14T18:30:00Z', 48.8566, 2.3522, 10.789, 290.442],
    ['Sydney, été austral, soleil au nord', '2024-01-15T02:00:00Z', -33.8688, 151.2093, 77.335, 4.513],
    ['Tromsø, soleil de minuit', '2024-06-21T23:00:00Z', 69.6492, 18.9553, 3.117, 3.169],
  ];

  it.each(cases)('%s', (_, at, latitude, longitude, elevation, azimuth) => {
    const sun = sunPosition(new Date(at), latitude, longitude);
    expect(sun.elevation).toBeCloseTo(elevation, 0);
    expect(sun.azimuth).toBeCloseTo(azimuth, 0);
  });

  it('finds the sun near the zenith at the equator on an equinox', () => {
    // L'azimut, lui, ne veut plus rien dire si près du zénith : pas comparé.
    expect(sunPosition(new Date('2025-09-22T17:00:00Z'), -0.1807, -78.4678).elevation).toBeCloseTo(88.375, 0);
  });
});

describe('sunLighting, colour and weather', () => {
  it('turns the sun golden, then orange, as it nears the horizon', () => {
    const [, green, blue] = sunLighting({ elevation: 40 }).color;
    const golden = sunLighting({ elevation: 6 }).color;
    const setting = sunLighting({ elevation: 1 }).color;
    expect(golden[2]).toBeLessThan(blue);
    expect(setting[1]).toBeLessThan(golden[1]);
    expect(green).toBeGreaterThan(golden[1]);
  });

  it('veils the sun and softens its shadows under clouds', () => {
    const clear = sunLighting({ elevation: 40 });
    const overcast = sunLighting({ elevation: 40 }, 0, 1);
    expect(overcast.sun).toBeLessThan(clear.sun / 2);
    expect(overcast.softness).toBeGreaterThan(clear.softness);
    expect(overcast.shadow).toBeLessThan(clear.shadow);
  });

  it('greys the sky and hides the stars under clouds', () => {
    expect(skyColors(40, 1).top).not.toBe(skyColors(40).top);
    expect(skyColors(-20, 1).stars).toBe(0);
  });
});

describe('precipitation', () => {
  it('rains harder when it pours, and flashes during a storm', () => {
    expect(precipitation('pouring').rain).toBeGreaterThan(precipitation('rainy').rain);
    expect(precipitation('lightning-rainy')).toMatchObject({ lightning: true });
    expect(precipitation('rainy').lightning).toBe(false);
  });

  it('snows, and mixes both for sleet', () => {
    expect(precipitation('snowy')).toMatchObject({ rain: 0 });
    expect(precipitation('snowy-rainy').rain).toBeGreaterThan(0);
    expect(precipitation('snowy-rainy').snow).toBeGreaterThan(0);
  });

  it('lets nothing fall otherwise', () => {
    expect(precipitation('sunny')).toEqual({ rain: 0, snow: 0, lightning: false });
    expect(precipitation(undefined)).toEqual({ rain: 0, snow: 0, lightning: false });
  });
});

describe('rooms', () => {
  const L: [number, number][] = [
    [0, 0],
    [4, 0],
    [4, 2],
    [2, 2],
    [2, 4],
    [0, 4],
  ];

  it('keeps readable rooms, and drops the rest', () => {
    const room = { id: 'r1', name: 'Salon', y: 0.2, points: L };
    expect(normalizeRooms([room])).toEqual([room]);
    expect(normalizeRooms([{ ...room, points: L.slice(0, 2) }, { ...room, y: 'bas' }, { ...room, name: 3 }, null, 'x'])).toEqual([]);
    // Un sommet illisible est oublié ; il en reste assez pour une pièce.
    expect(normalizeRooms([{ ...room, points: [...L, [1, NaN]] }])).toEqual([room]);
  });

  it('tells whether a point is inside an L-shaped room', () => {
    expect(pointInPolygon(1, 1, L)).toBe(true);
    expect(pointInPolygon(3, 1, L)).toBe(true);
    expect(pointInPolygon(1, 3, L)).toBe(true);
    expect(pointInPolygon(3, 3, L)).toBe(false); // le creux du L
    expect(pointInPolygon(5, 1, L)).toBe(false);
  });

  it('finds the centre of a room by its area, in either winding', () => {
    const square: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(polygonCentroid(square)).toEqual([1, 1]);
    expect(polygonCentroid([...square].reverse())).toEqual([1, 1]);
    const [x, z] = polygonCentroid(L);
    expect(x).toBeCloseTo(5 / 3);
    expect(z).toBeCloseTo(5 / 3);
  });
});

describe('compassHeading', () => {
  it('follows the top of the screen, clockwise from north', () => {
    expect(compassHeading(0)).toBe(0);
    // `alpha` tourne dans le sens inverse des aiguilles : 90, c'est l'ouest.
    expect(compassHeading(90)).toBe(270);
    expect(compassHeading(270)).toBe(90);
  });

  it('turns with the screen in landscape', () => {
    expect(compassHeading(0, 90)).toBe(90);
    expect(compassHeading(30, 270)).toBe(240);
  });

  it('has no heading without an absolute orientation', () => {
    expect(compassHeading(null)).toBeNull();
  });
});

describe('shortestTurn', () => {
  it('turns the short way, across ±π too', () => {
    expect(shortestTurn(0, 0.5)).toBeCloseTo(0.5);
    expect(shortestTurn(0, (3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2);
    expect(shortestTurn(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(shortestTurn(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
    expect(shortestTurn(1, 1 + 4 * Math.PI)).toBeCloseTo(0);
  });
});

describe('isPresence', () => {
  it('spots a triggered motion or presence detector, and nothing else', () => {
    expect(isPresence('on', { device_class: 'motion' })).toBe(true);
    expect(isPresence('on', { device_class: 'occupancy' })).toBe(true);
    expect(isPresence('off', { device_class: 'presence' })).toBe(false);
    // Une porte ouverte est « on » aussi, sans personne derrière.
    expect(isPresence('on', { device_class: 'door' })).toBe(false);
    expect(isPresence('unavailable', { device_class: 'motion' })).toBe(false);
  });
});

describe('thermal view', () => {
  it('reads a temperature, in Celsius or Fahrenheit, and nothing else', () => {
    expect(temperatureOf('21.5', { unit_of_measurement: '°C' })).toEqual({ value: 21.5, celsius: 21.5 });
    expect(temperatureOf('68', { unit_of_measurement: '°F' })).toEqual({ value: 68, celsius: 20 });
    expect(temperatureOf('19', { device_class: 'temperature' })).toEqual({ value: 19, celsius: 19 });
    expect(temperatureOf('55', { unit_of_measurement: '%' })).toBeNull();
    expect(temperatureOf('unavailable', { unit_of_measurement: '°C' })).toBeNull();
  });

  it('colours a room from cold blue to hot red', () => {
    expect(thermalColor(10)).toBe('#3b82f6');
    expect(thermalColor(20)).toBe('#4ade80');
    expect(thermalColor(30)).toBe('#ef4444');
    // Entre deux repères, un mélange des deux.
    expect(thermalColor(21)).not.toBe(thermalColor(20));
  });
});

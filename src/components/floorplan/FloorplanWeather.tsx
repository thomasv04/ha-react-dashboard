import { useEffect, useRef } from 'react';
import type { Precipitation } from '@/lib/floorplan';
import { cn } from '@/lib/utils';

/**
 * Le temps qu'il fait, par-dessus la maquette : pluie, grêle, neige, les
 * éclairs d'un orage, le givre quand il gèle.
 *
 * Rien de réglé d'avance : chaque averse sème ses gouttes au hasard, chaque
 * calque part d'un point de sa course, à sa vitesse, la pluie forcit et
 * faiblit, l'orage frappe quand il veut. Tout glisse ou change d'opacité : le
 * compositeur l'anime seul, sans repeindre la page ni redessiner la maquette.
 */

/** Au hasard, entre `a` et `b`. */
const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** Un dixième de pixel suffit. */
const px = (v: number) => v.toFixed(1);

/** Une marque d'une tuile de `w` × `h` px, posée au hasard. */
type Mark = (w: number, h: number) => string;

/**
 * Une tuile SVG semée de `count` marques. Aucune près d'un bord : la tuile se
 * répète, une marque coupée s'y verrait.
 */
const tile = (w: number, h: number, count: number, mark: Mark) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${Array.from({ length: count }, () => mark(w, h)).join('')}</svg>`
  )}")`;

/** Une goutte, dans la pente de sa chute : elle recule d'un quart de ce qu'elle descend. */
const drop =
  (length: [number, number], width: number, opacity: [number, number]): Mark =>
  (w, h) => {
    const l = rand(...length);
    const x = rand(l / 4 + 3, w - 3);
    const y = rand(3, h - l - 3);
    return `<line x1='${px(x)}' y1='${px(y)}' x2='${px(x - l / 4)}' y2='${px(y + l)}' stroke='rgb(210,225,255)' stroke-width='${width}' stroke-linecap='round' stroke-opacity='${rand(...opacity).toFixed(2)}'/>`;
  };

/** Un grêlon, et sa traînée au-dessus de lui. */
const pellet =
  (radius: [number, number], opacity: [number, number]): Mark =>
  (w, h) => {
    const r = rand(...radius);
    const x = rand(r + 3, w - r - 3);
    const y = rand(7 * r + 3, h - r - 3);
    return `<line x1='${px(x)}' y1='${px(y - 7 * r)}' x2='${px(x)}' y2='${px(y)}' stroke='white' stroke-width='${px(r)}' stroke-linecap='round' stroke-opacity='0.15'/><circle cx='${px(x)}' cy='${px(y)}' r='${px(r)}' fill='white' fill-opacity='${rand(...opacity).toFixed(2)}'/>`;
  };

/** Un flocon. */
const flake =
  (radius: [number, number], opacity: [number, number]): Mark =>
  (w, h) => {
    const r = rand(...radius);
    return `<circle cx='${px(rand(r + 2, w - r - 2))}' cy='${px(rand(r + 2, h - r - 2))}' r='${px(r)}' fill='white' fill-opacity='${rand(...opacity).toFixed(2)}'/>`;
  };

/** Une aiguille de glace, dans n'importe quel sens : le givre. */
const needle: Mark = (w, h) => {
  const l = rand(3, 13);
  const a = rand(0, Math.PI);
  const [dx, dy] = [(Math.cos(a) * l) / 2, (Math.sin(a) * l) / 2];
  const x = rand(l / 2 + 2, w - l / 2 - 2);
  const y = rand(l / 2 + 2, h - l / 2 - 2);
  return `<line x1='${px(x - dx)}' y1='${px(y - dy)}' x2='${px(x + dx)}' y2='${px(y + dy)}' stroke='white' stroke-width='0.9' stroke-linecap='round' stroke-opacity='${rand(0.35, 0.85).toFixed(2)}'/>`;
};

/**
 * Un calque de ce qui tombe : sa tuile de `w` × `h` px descend d'elle-même en
 * `seconds` — la boucle ne se voit pas. Penchée (`slanted`), elle recule de
 * sa largeur en descendant : la pluie tombe en biais.
 */
interface Layer {
  w: number;
  h: number;
  slanted?: boolean;
  seconds: number;
  count: number;
  mark: Mark;
  /** Des flocons : ils se balancent de tant de pixels. */
  sway?: number;
  /** Une averse forcit et faiblit : son opacité la plus basse. */
  shower?: number;
}

// Les lointains d'abord : les proches, plus gros et plus vifs, passent devant.
const RAIN: Layer[] = [
  { w: 90, h: 360, slanted: true, seconds: 1.2, count: 16, mark: drop([9, 16], 0.8, [0.2, 0.35]), shower: 0.5 },
  { w: 120, h: 480, slanted: true, seconds: 1.1, count: 20, mark: drop([14, 24], 1, [0.35, 0.6]), shower: 0.6 },
];
const HAIL: Layer[] = [
  { w: 110, h: 330, seconds: 0.6, count: 7, mark: pellet([0.9, 1.4], [0.4, 0.65]) },
  { w: 140, h: 420, seconds: 0.62, count: 9, mark: pellet([1.5, 2.5], [0.7, 0.95]) },
];
const SNOW: Layer[] = [
  { w: 170, h: 170, seconds: 7, count: 10, mark: flake([0.8, 1.4], [0.35, 0.6]), sway: 5 },
  { w: 240, h: 240, seconds: 13.5, count: 13, mark: flake([1.4, 2.6], [0.7, 0.95]), sway: 8 },
];

/** Tirés au hasard dans l'effet, pas au rendu : semis, vitesse, point de départ. */
function FallingLayer({ layer }: { layer: Layer }) {
  const ref = useRef<HTMLElement>(null);
  const { w, h, slanted, sway = 0 } = layer;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.backgroundImage = tile(w, h, layer.count, layer.mark);
    // Un cycle entamé au hasard, pour chaque animation.
    const loop = { iterations: Infinity, delay: -rand(0, 20_000) };
    const swing = { ...loop, direction: 'alternate', easing: 'ease-in-out' } as const;
    const animations = [
      el.animate([{ transform: 'none' }, { transform: `translate(${slanted ? -w : 0}px, ${h}px)` }], {
        ...loop,
        duration: layer.seconds * rand(920, 1080),
      }),
      ...(sway
        ? [el.animate([{ translate: `${-sway}px 0` }, { translate: `${sway}px 0` }], { ...swing, duration: rand(3000, 6000) })]
        : []),
      ...(layer.shower ? [el.animate([{ opacity: layer.shower }, { opacity: 1 }], { ...swing, duration: rand(3500, 7000) })] : []),
    ];
    return () => animations.forEach(a => a.cancel());
  }, [layer, w, h, slanted, sway]);

  // Il dépasse d'une tuile du côté d'où il vient, et de quoi se balancer.
  return <i ref={ref} className='fp-layer' style={{ inset: `${-h}px ${-(slanted ? w : 0) - sway}px 0 ${-sway}px` }} />;
}

function Falling({ className, layers, opacity }: { className: string; layers: Layer[]; opacity: number }) {
  return (
    <div className={cn('fp-weather', className)} style={{ opacity }}>
      {layers.map((layer, i) => (
        <FallingLayer key={i} layer={layer} />
      ))}
    </div>
  );
}

/** Un à trois éclairs rapprochés, chacun de sa force ; puis le calme, de 4 à 14 s. */
function Lightning() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer = 0;
    const strike = () => {
      const frames: Keyframe[] = [{ opacity: 0 }];
      for (let i = 1 + Math.floor(rand(0, 3)); i > 0; i--) frames.push({ opacity: rand(0.25, 0.6) }, { opacity: rand(0, 0.06) });
      frames.push({ opacity: 0 });
      ref.current?.animate(frames, { duration: frames.length * rand(60, 110) });
      timer = window.setTimeout(strike, rand(4000, 14_000));
    };
    timer = window.setTimeout(strike, rand(1000, 5000));
    return () => window.clearTimeout(timer);
  }, []);
  return <div ref={ref} className='fp-weather fp-lightning' />;
}

/** Le givre : des aiguilles de glace au hasard, qui gagnent les coins. Immobile. */
function Frost({ opacity }: { opacity: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundImage = tile(200, 200, 110, needle);
  }, []);
  return <div ref={ref} className='fp-weather fp-frost' style={{ opacity }} />;
}

/**
 * `falling` : ce qui tombe, `null` sans animation — économie d'énergie,
 * animations réduites. `frost` : le givre, de 0 à 1, immobile, toujours là.
 */
export function Weather({ falling, frost }: { falling: Precipitation | null; frost: number }) {
  return (
    <>
      {falling && falling.rain > 0 && <Falling className='fp-rain' layers={RAIN} opacity={falling.rain} />}
      {falling && falling.hail > 0 && <Falling className='fp-hail' layers={HAIL} opacity={falling.hail} />}
      {falling && falling.snow > 0 && <Falling className='fp-snow' layers={SNOW} opacity={falling.snow} />}
      {frost > 0 && <Frost opacity={frost} />}
      {falling?.lightning && <Lightning />}
    </>
  );
}

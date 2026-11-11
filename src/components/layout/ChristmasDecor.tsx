import { useEffect, useRef } from 'react';
import { isChristmasSeason, useTheme, type ChristmasSettings } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Le décor de Noël : la neige qui tombe sur tout l'écran (`ChristmasSnow`,
 * monté une fois dans le shell) et la guirlande lumineuse qui fait le tour de
 * chaque panneau (`PanelGarland`, montée dans chaque panneau), et les étoiles
 * pendues en haut de l'écran (`ChristmasStars`, dans le shell).
 */

// ponytail: la saison est évaluée au rendu ; une tablette qui tourne sans
// re-rendu du 30 novembre au 1er décembre attend le prochain rendu pour s'allumer.
function useChristmas(): ChristmasSettings | null {
  const { christmasSettings: c } = useTheme();
  const active = c.mode === 'on' || (c.mode === 'season' && isChristmasSeason(new Date()));
  return active ? c : null;
}

const FLAKES: Record<ChristmasSettings['snowAmount'], number> = { light: 45, normal: 100, heavy: 200 };

export function ChristmasSnow() {
  const c = useChristmas();
  const { perfSettings, tokens } = useTheme();
  if (!c?.snow || perfSettings.reduceAnimations) return null;
  // Sur un thème clair, des flocons blancs ne se verraient pas.
  return <Snow count={FLAKES[c.snowAmount]} color={tokens.light ? '#9fb3cc' : '#ffffff'} />;
}

/** Position (% de la largeur), longueur du fil, taille : fixes, pour ne pas bouger d'un rendu à l'autre. */
const STARS = [
  { x: 3, len: 150, size: 18 },
  { x: 11, len: 60, size: 12 },
  { x: 19, len: 210, size: 22 },
  { x: 28, len: 110, size: 14 },
  { x: 37, len: 40, size: 10 },
  { x: 46, len: 170, size: 34, glow: true },
  { x: 55, len: 80, size: 12 },
  { x: 64, len: 230, size: 16 },
  { x: 90, len: 190, size: 20 },
  { x: 97, len: 120, size: 13 },
];

/** Une étoile aux branches arrondies (le trait de même couleur les adoucit). */
const STAR_PATH = 'M12 2.5l2.8 6.4 6.9.6-5.2 4.6 1.6 6.8L12 17.3l-6.1 3.6 1.6-6.8-5.2-4.6 6.9-.6z';

export function ChristmasStars() {
  const c = useChristmas();
  if (!c?.stars) return null;
  return (
    <div aria-hidden='true' className='pointer-events-none fixed inset-x-0 top-0 z-[65]'>
      {STARS.map((s, i) => (
        <span
          key={s.x}
          className='xmas-star'
          style={{ left: `${s.x}%`, animationDelay: `${i * -0.7}s`, animationDuration: `${3.5 + (i % 3)}s` }}
        >
          <span className='xmas-star-string' style={{ height: s.len }} />
          <svg width={s.size} height={s.size} viewBox='0 0 24 24' className={cn('xmas-star-shape', s.glow && 'xmas-star-glow')}>
            <path d={STAR_PATH} />
          </svg>
        </span>
      ))}
    </div>
  );
}

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  drift: number;
  a: number;
}

function Snow({ count, color }: { count: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (anywhere: boolean): Flake => {
      // Des points ronds et francs, comme dans une illustration : beaucoup de
      // petits, quelques gros — les gros, plus proches, tombent plus vite.
      const r = 1.2 + Math.random() ** 3 * 6;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -12,
        r,
        vy: 0.35 + r * 0.25,
        phase: Math.random() * Math.PI * 2,
        drift: 0.3 + Math.random() * 0.7,
        a: 0.8 + Math.random() * 0.2,
      };
    };
    const flakes = Array.from({ length: count }, () => spawn(true));

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.phase += 0.012 * dt;
        f.x += Math.sin(f.phase) * f.drift * dt;
        if (f.y > h + 12) Object.assign(f, spawn(false));
        ctx.globalAlpha = f.a;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // requestAnimationFrame se met en pause tout seul quand l'onglet est caché.
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, color]);

  return <canvas ref={ref} aria-hidden='true' className='pointer-events-none fixed inset-0 z-[70] h-full w-full' />;
}

/** Rouge, or, vert, bleu : l'ordre des ampoules le long du fil. */
const BULBS = ['#ff4d4d', '#ffc94a', '#4cd07d', '#4aa8ff'];
/** Écart entre deux ampoules, en px le long du contour. */
const STEP = 32;

/** La guirlande autour d'un panneau, et la neige posée dessus. Le panneau doit être `relative`. */
export function PanelGarland() {
  const c = useChristmas();
  if (!c) return null;
  return (
    <>
      {c.snowCaps && <span aria-hidden='true' className='xmas-snowcap' />}
      {c.garlands && (
        <svg aria-hidden='true' className={cn('xmas-garland', c.twinkle && 'xmas-twinkle')}>
          {/* Le fil, torsadé : un trait sombre, un trait plus clair en pointillé par-dessus. */}
          <rect width='100%' height='100%' rx='27' className='xmas-cord' />
          <rect width='100%' height='100%' rx='27' className='xmas-cord-twist' />
          {BULBS.map((color, i) => (
            <g key={color} className='xmas-bulb' style={{ stroke: color, animationDelay: `${i * -0.45}s` }}>
              <rect
                width='100%'
                height='100%'
                rx='27'
                strokeWidth='14'
                strokeOpacity='0.22'
                strokeDasharray={`0 ${STEP * BULBS.length}`}
                strokeDashoffset={-i * STEP}
              />
              <rect
                width='100%'
                height='100%'
                rx='27'
                strokeWidth='9'
                strokeDasharray={`0 ${STEP * BULBS.length}`}
                strokeDashoffset={-i * STEP}
              />
            </g>
          ))}
        </svg>
      )}
    </>
  );
}

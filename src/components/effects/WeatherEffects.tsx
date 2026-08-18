import { useEffect, useRef, useState } from 'react';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';

const FRAME_INTERVAL_MS = 1000 / 30;

export type EffectType = 'rain' | 'pouring' | 'drizzle' | 'snow' | 'hail' | 'fog' | 'clouds' | 'wind' | 'stars';

/**
 * Effet correspondant à un état météo de Home Assistant.
 *
 * La liste des états est fermée (cf. l'intégration `weather`) : ce qui n'y
 * figure pas — `sunny`, `exceptional` — n'a pas d'animation, et c'est voulu.
 * Une card de plein soleil doit rester calme.
 */
export function getEffectType(condition: string | undefined): EffectType | null {
  switch (condition?.toLowerCase()) {
    case 'pouring':
      return 'pouring';
    case 'rainy':
    case 'lightning-rainy':
      return 'rain';
    case 'snowy':
    case 'snowy-rainy':
      return 'snow';
    case 'hail':
      return 'hail';
    case 'fog':
      return 'fog';
    // `partly-cloudy` : la variante avec tiret que renvoient certaines
    // intégrations, à côté de l'état canonique de Home Assistant.
    case 'cloudy':
    case 'partlycloudy':
    case 'partly-cloudy':
      return 'clouds';
    case 'windy':
    case 'windy-variant':
      return 'wind';
    case 'clear-night':
      return 'stars';
    default:
      return null;
  }
}

/** L'orage éclaire la card, en plus de sa pluie. */
export function hasLightning(condition: string | undefined): boolean {
  const c = condition?.toLowerCase();
  return c === 'lightning' || c === 'lightning-rainy';
}

interface EffectConfig {
  count: number;
  color: string;
  /** Vitesse verticale, en pixels par image */
  speed: [number, number];
  /** Vitesse horizontale, en pixels par image */
  drift: [number, number];
  /** Longueur du trait, ou rayon du disque, selon la forme */
  size: [number, number];
  shape: 'streak' | 'dot' | 'blob';
  lineWidth?: number;
  /** Le disque ondule latéralement (flocon) ou en opacité (étoile) */
  wobble?: 'drift' | 'twinkle';
}

const EFFECTS: Record<EffectType, EffectConfig> = {
  rain: {
    count: 36,
    color: 'rgba(174,194,224,0.40)',
    speed: [2.5, 5.5],
    drift: [0.2, 0.6],
    size: [8, 14],
    shape: 'streak',
    lineWidth: 1.5,
  },
  pouring: {
    count: 60,
    color: 'rgba(174,194,224,0.50)',
    speed: [5, 9],
    drift: [0.6, 1.4],
    size: [12, 22],
    shape: 'streak',
    lineWidth: 1.6,
  },
  drizzle: {
    count: 26,
    color: 'rgba(174,194,224,0.28)',
    speed: [1.4, 2.6],
    drift: [0.1, 0.3],
    size: [4, 7],
    shape: 'streak',
    lineWidth: 1,
  },
  snow: { count: 24, color: 'rgba(255,255,255,0.50)', speed: [0.5, 1.5], drift: [0, 0], size: [1, 2.5], shape: 'dot', wobble: 'drift' },
  hail: { count: 30, color: 'rgba(226,240,255,0.65)', speed: [4, 7], drift: [0.3, 0.8], size: [1.5, 3], shape: 'dot' },
  fog: { count: 7, color: 'rgba(203,213,225,0.16)', speed: [0, 0.05], drift: [0.15, 0.45], size: [50, 110], shape: 'blob' },
  clouds: { count: 5, color: 'rgba(226,232,240,0.13)', speed: [0, 0.03], drift: [0.08, 0.22], size: [55, 120], shape: 'blob' },
  wind: { count: 16, color: 'rgba(226,232,240,0.22)', speed: [0, 0.1], drift: [2.5, 6], size: [22, 60], shape: 'streak', lineWidth: 1.2 },
  stars: { count: 34, color: 'rgba(255,255,255,0.85)', speed: [0, 0], drift: [0, 0.03], size: [0.6, 1.6], shape: 'dot', wobble: 'twinkle' },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

interface WeatherEffectsProps {
  condition: string | undefined;
}

export default function WeatherEffects({ condition }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useLowPowerMotion();
  const [isVisible, setIsVisible] = useState(true);

  const effectType = getEffectType(condition);
  const lightning = hasLightning(condition);
  const animated = effectType !== null || lightning;

  useEffect(() => {
    if (!animated || !motionAllowed) return;
    const canvas = canvasRef.current;
    const target = canvas?.parentElement;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: '80px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [animated, motionAllowed]);

  useEffect(() => {
    if (!motionAllowed || !isVisible || !animated) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const cfg = effectType ? EFFECTS[effectType] : null;
    const particles: Particle[] = cfg
      ? Array.from({ length: cfg.count }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: between(cfg.drift),
          vy: between(cfg.speed),
          size: between(cfg.size),
          phase: Math.random() * Math.PI * 2,
        }))
      : [];

    // Éclair : deux coups brefs, puis rien pendant quelques secondes. Un
    // `setTimeout` par éclair se désynchroniserait de la boucle de dessin ; un
    // compte à rebours en images reste dans son rythme.
    let flashIn = 60 + Math.random() * 180;
    let flashLeft = 0;

    let lastFrameAt = 0;
    const draw = (time: number) => {
      if (time - lastFrameAt < FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = time;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (cfg) {
        ctx.fillStyle = cfg.color;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = cfg.lineWidth ?? 1;

        for (const p of particles) {
          p.phase += 0.05;

          if (cfg.shape === 'streak') {
            // Le trait suit sa trajectoire : vertical sous la pluie, presque
            // couché dans le vent, sans traiter les deux cas séparément.
            const norm = Math.hypot(p.vx, p.vy) || 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + (p.vx / norm) * p.size, p.y + (p.vy / norm) * p.size);
            ctx.stroke();
          } else if (cfg.shape === 'dot') {
            ctx.globalAlpha = cfg.wobble === 'twinkle' ? 0.35 + 0.65 * Math.abs(Math.sin(p.phase)) : 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            // Nappe : un dégradé radial, la seule forme qui ne se lise pas
            // comme un disque une fois posée sur la card.
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, cfg.color);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = cfg.color;
          }

          p.x += p.vx + (cfg.wobble === 'drift' ? Math.sin(p.y * 0.05) * 0.5 : 0);
          p.y += p.vy;

          // Réapparition par le côté opposé : sans ça la card se vide en
          // quelques secondes, brouillard et nuages en tête.
          const margin = cfg.shape === 'blob' ? p.size : 8;
          if (p.y - margin > height) {
            p.y = -margin;
            p.x = Math.random() * width;
          }
          if (p.x - margin > width) p.x = -margin;
          if (p.x + margin < 0) p.x = width + margin;
        }
      }

      if (lightning) {
        flashIn -= 1;
        if (flashIn <= 0) {
          flashLeft = 4;
          flashIn = 90 + Math.random() * 240;
        }
        if (flashLeft > 0) {
          // Une image sur deux allumée : le clignotement d'un éclair.
          if (flashLeft === 4 || flashLeft === 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(0, 0, width, height);
          }
          flashLeft -= 1;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effectType, lightning, animated, isVisible, motionAllowed]);

  if (!animated || !motionAllowed) return null;

  return (
    <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl'>
      <canvas ref={canvasRef} className='block h-full w-full' style={{ opacity: 0.8 }} />
    </div>
  );
}

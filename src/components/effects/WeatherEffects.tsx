import { useEffect, useRef, useState } from 'react';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';

const FRAME_INTERVAL_MS = 1000 / 30;

type EffectType = 'rain' | 'snow';

function getEffectType(condition: string | undefined): EffectType | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (['rainy', 'pouring', 'lightning-rainy'].includes(c)) return 'rain';
  if (['snowy', 'snowy-rainy'].includes(c)) return 'snow';
  return null;
}

const PARTICLE_CONFIG = {
  rain: {
    count: 36,
    speed: { min: 2.5, max: 5.5 },
    color: 'rgba(174, 194, 224, 0.4)',
    width: 1.5,
    length: { min: 8, max: 14 },
  },
  snow: {
    count: 24,
    speed: { min: 0.5, max: 1.5 },
    color: 'rgba(255, 255, 255, 0.5)',
    radius: { min: 1, max: 2.5 },
  },
} as const;

interface Particle {
  x: number;
  y: number;
  speed: number;
  length: number;
  radius: number;
}

interface WeatherEffectsProps {
  condition: string | undefined;
}

export default function WeatherEffects({ condition }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useLowPowerMotion();
  const [isVisible, setIsVisible] = useState(true);

  const effectType = getEffectType(condition);

  useEffect(() => {
    if (!effectType || !motionAllowed) return;
    const canvas = canvasRef.current;
    const target = canvas?.parentElement;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: '80px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [effectType, motionAllowed]);

  useEffect(() => {
    if (!motionAllowed || !isVisible || !effectType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const cfg = PARTICLE_CONFIG[effectType];
    particles = Array.from({ length: cfg.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: cfg.speed.min + Math.random() * (cfg.speed.max - cfg.speed.min),
      length: 'length' in cfg ? cfg.length.min + Math.random() * (cfg.length.max - cfg.length.min) : 0,
      radius: 'radius' in cfg ? cfg.radius.min + Math.random() * (cfg.radius.max - cfg.radius.min) : 0,
    }));

    let lastFrameAt = 0;
    const draw = (time: number) => {
      if (time - lastFrameAt < FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 'width' in cfg ? cfg.width : 1;

      for (const p of particles) {
        ctx.beginPath();
        if (effectType === 'rain') {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.length);
          ctx.stroke();
          p.y += p.speed;
          if (p.y > canvas.height) {
            p.y = -p.length;
            p.x = Math.random() * canvas.width;
          }
        } else {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed;
          p.x += Math.sin(p.y * 0.05) * 0.5;
          if (p.y > canvas.height) {
            p.y = -5;
            p.x = Math.random() * canvas.width;
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effectType, isVisible, motionAllowed]);

  if (!effectType || !motionAllowed) return null;

  return (
    <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl'>
      <canvas ref={canvasRef} className='block h-full w-full' style={{ opacity: 0.8 }} />
    </div>
  );
}

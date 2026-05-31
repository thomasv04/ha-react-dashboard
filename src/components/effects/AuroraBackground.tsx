import { useEffect, useRef } from 'react';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import type { AuroraConfig } from '@/config/themes';

const FRAME_INTERVAL_MS = 1000 / 30;
const DPR_CAP = 1.5;
const RESIZE_DEBOUNCE_MS = 150;

interface Orb {
  /** 0–1 normalized position */
  nx: number;
  ny: number;
  vx: number;
  vy: number;
  radiusRatio: number;
  color: string;
  opacity: number;
  /** Sinusoidal sway phases */
  phaseX: number;
  phaseY: number;
  phaseSpeedX: number;
  phaseSpeedY: number;
}

const PALETTES: Record<string, string[]> = {
  default: ['rgba(99,102,241,', 'rgba(56,189,248,', 'rgba(167,139,250,', 'rgba(20,184,166,', 'rgba(139,92,246,'],
  warm: ['rgba(251,146,60,', 'rgba(251,191,36,', 'rgba(239,68,68,', 'rgba(245,101,101,', 'rgba(252,211,77,'],
  cool: ['rgba(14,165,233,', 'rgba(56,189,248,', 'rgba(99,102,241,', 'rgba(6,182,212,', 'rgba(96,165,250,'],
  nature: ['rgba(34,197,94,', 'rgba(16,185,129,', 'rgba(20,184,166,', 'rgba(101,163,13,', 'rgba(74,222,128,'],
  mono: ['rgba(200,200,200,', 'rgba(160,160,160,', 'rgba(220,220,220,', 'rgba(130,130,130,', 'rgba(180,180,180,'],
};

interface AuroraBackgroundProps {
  config?: AuroraConfig;
}

export function AuroraBackground({ config }: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useLowPowerMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const palette = PALETTES[config?.palette ?? 'default'] ?? PALETTES.default;
    const orbCount = Math.max(1, Math.min(12, config?.orbCount ?? 5));
    const speedMult = config?.speed ?? 1;
    const sizeMult = config?.size ?? 1;
    const opacity = config?.opacity ?? 1;
    const swayMult = config?.sway ?? 1;

    if (!motionAllowed) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const g = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(99,102,241,0.35)');
      g.addColorStop(0.5, 'rgba(56,189,248,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastFrameAt = 0;
    let orbs: Orb[] = [];
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const colors = Array.from({ length: orbCount }, (_, i) => palette[i % palette.length]);

    const initOrbs = () => {
      orbs = colors.map(color => ({
        nx: Math.random(),
        ny: Math.random(),
        vx: (Math.random() - 0.5) * 0.4 * speedMult,
        vy: (Math.random() - 0.5) * 0.3 * speedMult,
        radiusRatio: (0.35 + Math.random() * 0.3) * sizeMult,
        color,
        opacity: (0.25 + Math.random() * 0.2) * opacity,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseSpeedX: (0.004 + Math.random() * 0.006) * speedMult,
        phaseSpeedY: (0.003 + Math.random() * 0.005) * speedMult,
      }));
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Always reset transform before scaling to avoid accumulation
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    initOrbs();
    resizeCanvas();
    animId = requestAnimationFrame(draw);

    function draw(time: number) {
      if (time - lastFrameAt < FRAME_INTERVAL_MS) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = time;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const minDim = Math.min(w, h);

      ctx.clearRect(0, 0, w, h);

      for (const orb of orbs) {
        orb.phaseX += orb.phaseSpeedX;
        orb.phaseY += orb.phaseSpeedY;

        orb.nx += (orb.vx + Math.sin(orb.phaseX) * 0.5 * swayMult * speedMult) / w;
        orb.ny += (orb.vy + Math.cos(orb.phaseY) * 0.4 * swayMult * speedMult) / h;

        // Wrap around using normalized coords
        if (orb.nx < -0.2) orb.nx = 1.2;
        if (orb.nx > 1.2) orb.nx = -0.2;
        if (orb.ny < -0.2) orb.ny = 1.2;
        if (orb.ny > 1.2) orb.ny = -0.2;

        const x = orb.nx * w;
        const y = orb.ny * h;
        const radius = minDim * orb.radiusRatio;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `${orb.color}${orb.opacity})`);
        grad.addColorStop(1, `${orb.color}0)`);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    const onResize = () => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        resizeTimer = null;
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
    };
  }, [motionAllowed, config]);

  return <canvas ref={canvasRef} className='fixed inset-0 -z-10 pointer-events-none' style={{ mixBlendMode: 'screen' }} />;
}

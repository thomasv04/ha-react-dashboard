import { useEffect, useRef } from 'react';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import type { LavaConfig } from '@/config/themes';

const FRAME_INTERVAL_MS = 1000 / 30;
const DPR_CAP = 1.5;
const RESIZE_DEBOUNCE_MS = 150;

interface Blob {
  /** 0–1 normalized position */
  nx: number;
  ny: number;
  vx: number;
  vy: number;
  radiusRatio: number;
  color: string;
  phaseX: number;
  phaseY: number;
  phaseSpeedX: number;
  phaseSpeedY: number;
}

const PALETTES: Record<string, string[]> = {
  default: ['rgba(239,68,68,', 'rgba(251,146,60,', 'rgba(236,72,153,', 'rgba(234,179,8,',  'rgba(249,115,22,'],
  aurora:  ['rgba(99,102,241,', 'rgba(56,189,248,', 'rgba(167,139,250,','rgba(20,184,166,', 'rgba(139,92,246,'],
  cool:    ['rgba(14,165,233,', 'rgba(56,189,248,', 'rgba(99,102,241,', 'rgba(6,182,212,',  'rgba(96,165,250,'],
  nature:  ['rgba(34,197,94,',  'rgba(16,185,129,', 'rgba(20,184,166,', 'rgba(101,163,13,', 'rgba(74,222,128,'],
  mono:    ['rgba(200,200,200,','rgba(160,160,160,','rgba(220,220,220,','rgba(130,130,130,','rgba(180,180,180,'],
};

interface LavaLampBackgroundProps {
  config?: LavaConfig;
}

export function LavaLampBackground({ config }: LavaLampBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useLowPowerMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const palette = PALETTES[config?.palette ?? 'default'] ?? PALETTES.default;
    const blobCount = Math.max(1, Math.min(12, config?.blobCount ?? 5));
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
      const g = ctx.createRadialGradient(w * 0.4, h * 0.6, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.6);
      g.addColorStop(0, 'rgba(239,68,68,0.3)');
      g.addColorStop(0.5, 'rgba(251,146,60,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastFrameAt = 0;
    let blobs: Blob[] = [];
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const colors = Array.from({ length: blobCount }, (_, i) => palette[i % palette.length]);

    const initBlobs = () => {
      blobs = colors.map((color) => ({
        nx: Math.random(),
        ny: Math.random(),
        vx: (Math.random() - 0.5) * 0.15 * speedMult,
        vy: (Math.random() - 0.5) * 0.12 * speedMult,
        radiusRatio: (0.25 + Math.random() * 0.25) * sizeMult,
        color,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseSpeedX: (0.003 + Math.random() * 0.004) * speedMult,
        phaseSpeedY: (0.002 + Math.random() * 0.003) * speedMult,
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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    initBlobs();
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

      for (const blob of blobs) {
        blob.phaseX += blob.phaseSpeedX;
        blob.phaseY += blob.phaseSpeedY;

        blob.nx += (blob.vx + Math.sin(blob.phaseX) * 0.4 * speedMult * swayMult) / w;
        blob.ny += (blob.vy + Math.cos(blob.phaseY) * 0.3 * speedMult * swayMult) / h;

        // Wrap using normalized coords
        if (blob.nx < -0.2) blob.nx = 1.2;
        if (blob.nx > 1.2) blob.nx = -0.2;
        if (blob.ny < -0.2) blob.ny = 1.2;
        if (blob.ny > 1.2) blob.ny = -0.2;

        const x = blob.nx * w;
        const y = blob.ny * h;
        const radius = minDim * blob.radiusRatio;
        const op = 0.22 * opacity;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `${blob.color}${op})`);
        grad.addColorStop(0.5, `${blob.color}${op * 0.55})`);
        grad.addColorStop(1, `${blob.color}0)`);

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

  return (
    <canvas
      ref={canvasRef}
      className='fixed inset-0 -z-10 pointer-events-none'
    />
  );
}

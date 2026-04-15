import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { PerfSettings } from '@/context/ThemeContext';
import { PerfToggle } from './PerfToggle';

// ── FPS meter hook ────────────────────────────────────────────────────────────
function useFPS(active: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  const rafRef = useRef<number>(0);
  const framesRef = useRef(0);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!active) {
      setFps(null);
      return;
    }
    let running = true;

    function tick(now: number) {
      if (!running) return;
      framesRef.current++;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((framesRef.current / elapsed) * 1000));
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return fps;
}

function FPSMeter() {
  const [measuring, setMeasuring] = useState(false);
  const fps = useFPS(measuring);

  const color =
    fps === null ? 'text-white/30'
    : fps >= 55  ? 'text-green-400'
    : fps >= 30  ? 'text-yellow-400'
    : 'text-red-400';

  const label =
    fps === null ? '—'
    : fps >= 55  ? 'Excellent'
    : fps >= 30  ? 'Correct'
    : 'Faible';

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/4 border border-white/8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-white/40" />
          <span className="text-white/60 text-xs font-medium">Images par seconde (FPS)</span>
        </div>
        <button
          onClick={() => setMeasuring(v => !v)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
            measuring
              ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
              : 'bg-white/8 border-white/15 text-white/50 hover:bg-white/12 hover:text-white/70'
          }`}
        >
          {measuring ? 'Arrêter' : 'Mesurer'}
        </button>
      </div>

      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold tabular-nums leading-none transition-colors ${color}`}>
          {fps ?? '··'}
        </span>
        <div className="flex flex-col pb-0.5">
          <span className="text-white/30 text-xs leading-tight">fps</span>
          {measuring && fps !== null && (
            <span className={`text-xs font-medium leading-tight ${color}`}>{label}</span>
          )}
        </div>
        {measuring && fps !== null && (
          <div className="flex items-end gap-0.5 self-end pb-1 ml-auto">
            {[55, 45, 35, 25, 15].map((threshold, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-sm transition-all ${
                  fps >= threshold ? (fps >= 55 ? 'bg-green-400' : fps >= 30 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-white/10'
                }`}
                style={{ height: `${8 + i * 4}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {!measuring && (
        <p className="text-white/25 text-[10px] leading-relaxed">
          Mesure les FPS du rendu navigateur en temps réel pour diagnostiquer les ralentissements.
        </p>
      )}
    </div>
  );
}

export function PerformanceSection() {
  const { perfSettings, setPerfSettings } = useTheme();

  function toggle(key: keyof PerfSettings) {
    setPerfSettings({ ...perfSettings, [key]: !perfSettings[key] });
  }

  return (
    <div className="flex flex-col gap-5">
      <FPSMeter />

      <div className="flex flex-col">
      <p className="text-white/35 text-xs mb-5 leading-relaxed">
        Désactive les effets visuels coûteux pour améliorer les performances sur tablettes et petits appareils.
      </p>
      <PerfToggle
        checked={perfSettings.reduceBlur}
        onChange={() => toggle('reduceBlur')}
        label="Réduire les flous"
        description="Réduit le backdrop-filter de 20–40 px à 4 px sur toutes les cards."
      />
      <PerfToggle
        checked={perfSettings.reduceAnimations}
        onChange={() => toggle('reduceAnimations')}
        label="Désactiver les animations"
        description="Supprime les transitions et animations de l'interface."
      />
      <PerfToggle
        checked={perfSettings.disableShadows}
        onChange={() => toggle('disableShadows')}
        label="Désactiver les ombres"
        description="Supprime les box-shadow GPU des cards."
      />
      </div>
    </div>
  );
}

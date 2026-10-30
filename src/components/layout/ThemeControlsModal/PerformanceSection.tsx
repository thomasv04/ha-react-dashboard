import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import type { PerfSettings } from '@/context/ThemeContext';
import { PerfToggle } from './PerfToggle';
import { BUTTON_SECONDARY } from './controls';
import { SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

// ── FPS meter hook ────────────────────────────────────────────────────────────
function useFPS(active: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  const rafRef = useRef<number>(0);
  const framesRef = useRef(0);
  // eslint-disable-next-line react-hooks/purity
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
  const { t } = useI18n();
  const [measuring, setMeasuring] = useState(false);
  const fps = useFPS(measuring);

  const color =
    fps === null
      ? 'text-[var(--ds-ink-muted)]'
      : fps >= 55
        ? 'text-[var(--ds-good)]'
        : fps >= 30
          ? 'text-[var(--ds-warm-light)]'
          : 'text-[var(--ds-alert)]';
  const label =
    fps === null
      ? '—'
      : fps >= 55
        ? t('settings.performance_section.fpsExcellent')
        : fps >= 30
          ? t('settings.performance_section.fpsFair')
          : t('settings.performance_section.fpsLow');

  return (
    <div className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Activity size={20} className='text-[var(--ds-ink-muted)]' />
          <span className='text-lg font-semibold'>{t('settings.performance_section.fps')}</span>
        </div>
        <button onClick={() => setMeasuring(v => !v)} className={cn(BUTTON_SECONDARY, 'h-11', measuring && 'text-[var(--ds-alert)]')}>
          {measuring ? t('settings.performance_section.fpsStop') : t('settings.performance_section.fpsMeasure')}
        </button>
      </div>

      <div className='flex items-end gap-3'>
        <span className={`text-5xl font-bold tabular-nums leading-none transition-colors ${color}`}>{fps ?? '··'}</span>
        <div className='flex flex-col pb-0.5'>
          <span className='text-[var(--ds-ink-muted)] text-sm leading-tight'>fps</span>
          {measuring && fps !== null && <span className={`text-xs font-medium leading-tight ${color}`}>{label}</span>}
        </div>
        {measuring && fps !== null && (
          <div className='flex items-end gap-0.5 self-end pb-1 ml-auto'>
            {[55, 45, 35, 25, 15].map((threshold, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-sm transition-all ${
                  fps >= threshold
                    ? fps >= 55
                      ? 'bg-[var(--ds-good)] text-[var(--ds-good-ink)]'
                      : fps >= 30
                        ? 'bg-[var(--ds-warm-light)] text-[var(--ds-warm-light-ink)]'
                        : 'bg-[var(--ds-alert)] text-white'
                    : 'bg-[var(--ds-surface-3)]'
                }`}
                style={{ height: `${8 + i * 4}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {!measuring && (
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.performance_section.fpsDescription')}</p>
      )}
    </div>
  );
}

export function PerformanceSection() {
  const { t } = useI18n();
  const { perfSettings, setPerfSettings } = useTheme();

  function toggle(key: keyof PerfSettings) {
    setPerfSettings({ ...perfSettings, [key]: !perfSettings[key] });
  }

  return (
    <div className='flex flex-col gap-3'>
      <FPSMeter />

      <div className='flex flex-col gap-3'>
        <p className='px-1 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.performance_section.intro')}</p>
        <PerfToggle
          checked={perfSettings.reduceAnimations}
          onChange={() => toggle('reduceAnimations')}
          label={t('settings.performance_section.reduceAnimations')}
          description={t('settings.performance_section.reduceAnimationsDesc')}
        />
        <PerfToggle
          checked={perfSettings.disableShadows}
          onChange={() => toggle('disableShadows')}
          label={t('settings.performance_section.disableShadows')}
          description={t('settings.performance_section.disableShadowsDesc')}
        />
        <PerfToggle
          checked={perfSettings.disableModalAnimation}
          onChange={() => toggle('disableModalAnimation')}
          label={t('settings.performance_section.disableModalAnimation')}
          description={t('settings.performance_section.disableModalAnimationDesc')}
        />
        <PerfToggle
          checked={perfSettings.lowQualityCamera}
          onChange={() => toggle('lowQualityCamera')}
          label={t('settings.performance_section.lowQualityCamera')}
          description={t('settings.performance_section.lowQualityCameraDesc')}
        />
      </div>
    </div>
  );
}

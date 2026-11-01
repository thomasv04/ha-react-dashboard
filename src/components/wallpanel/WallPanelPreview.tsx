import { useLayoutEffect, useRef, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import type { WallPanelConfig } from '@/types/wallpanel';
import { BackgroundSlideshow } from './BackgroundSlideshow';
import { ScreensaverClock } from './ScreensaverClock';
import { WallPanelReadonlyShell } from './WallPanelEditShell';
import { useI18n } from '@/i18n';

/**
 * Écran de référence de l'aperçu : 16:10, la proportion de l'Echo Show.
 * La veille y est rendue à taille réelle puis réduite, pour que l'horloge et
 * les widgets gardent les proportions qu'ils auront sur la tablette.
 */
const PREVIEW_SCREEN = { w: 1280, h: 800 };

interface WallPanelPreviewProps {
  /** Le brouillon des réglages, pas la configuration enregistrée. */
  config: WallPanelConfig;
  /** Nombre de widgets posés sur la veille. */
  widgetCount: number;
  /** Nom de la page Plan servant de fond, s'il y en a une. */
  planLabel?: string;
}

/**
 * La veille en miniature, à côté de ses réglages : le fond, l'horloge et les
 * widgets suivent le brouillon à chaque modification. Inerte — on la regarde,
 * on ne s'en sert pas ; « Voir la veille » ouvre la vraie.
 */
export function WallPanelPreview({ config, widgetCount, planLabel }: WallPanelPreviewProps) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / PREVIEW_SCREEN.w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      data-testid='wallpanel-preview'
      role='img'
      aria-label={t('layout.wallPanel.preview.label')}
      className='relative aspect-[16/10] w-full overflow-hidden rounded-[var(--ds-radius-xl)] bg-[var(--ds-ground)] ring-[6px] ring-[var(--ds-surface-3)]'
    >
      <div
        inert
        aria-hidden='true'
        className='pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden select-none'
        style={{ width: PREVIEW_SCREEN.w, height: PREVIEW_SCREEN.h, transform: `scale(${scale})` }}
      >
        {config.floorplan_page ? (
          <div
            data-preview-plan
            className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)]'
          >
            <MapIcon size={96} strokeWidth={1.5} />
            <span className='text-4xl font-semibold'>{planLabel ?? t('layout.wallPanel.preview.plan')}</span>
          </div>
        ) : (
          <BackgroundSlideshow config={config} />
        )}

        {widgetCount > 0 && (
          <div className='absolute inset-0 z-10'>
            <WallPanelReadonlyShell config={config} />
          </div>
        )}

        <ScreensaverClock layout={config.clock_layout ?? 'clock'} />
      </div>
    </div>
  );
}

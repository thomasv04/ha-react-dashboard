import { useState, useEffect, useRef } from 'react';
import type { WallPanelConfig } from '@/types/wallpanel';
import { useResolvedMediaUrls } from '@/hooks/useResolvedMediaUrls';

interface BackgroundSlideshowProps {
  config: WallPanelConfig;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function BlurBg({ src, opacity }: { src: string; opacity: number }) {
  return (
    <div
      className='absolute inset-0'
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: 'center',
        backgroundSize: 'fill',
        filter: 'blur(15px)',
        transform: 'scale(1.08)',
        opacity,
        transition: 'opacity 1000ms',
      }}
    />
  );
}

export function BackgroundSlideshow({ config }: BackgroundSlideshowProps) {
  const resolvedUrls = useResolvedMediaUrls(config.image_urls);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [orderedUrls, setOrderedUrls] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // (Re)construire la liste ordonnée quand les URLs résolues ou l'ordre changent
  useEffect(() => {
    if (resolvedUrls.length === 0) return;
    const urls = config.media_order === 'random' ? shuffleArray(resolvedUrls) : [...resolvedUrls];
    setOrderedUrls(urls);
    setCurrentIdx(0);
    setNextIdx(Math.min(1, urls.length - 1));
  }, [resolvedUrls, config.media_order]);

  // Timer de défilement
  useEffect(() => {
    if (orderedUrls.length <= 1 || config.image_duration <= 0) return;
    intervalRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % orderedUrls.length);
        setNextIdx(prev => (prev + 1) % orderedUrls.length);
        setTransitioning(false);
      }, 1000); // durée du crossfade CSS
    }, config.image_duration * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderedUrls, config.image_duration]);

  if (orderedUrls.length === 0) {
    return <div className='absolute inset-0' style={{ background: 'linear-gradient(135deg, #0c1028 0%, #1a2550 100%)' }} />;
  }

  const blurPx = config.style.backgroundBlur ?? 0;
  const containBg = config.image_fit === 'contain' && (config.style.containBlurBackground ?? false);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      {/* ── Blurred fill background (contain mode only) ── */}
      {containBg && (
        <>
          <BlurBg src={orderedUrls[currentIdx]} opacity={transitioning ? 0 : 1} />
          {orderedUrls.length > 1 && <BlurBg src={orderedUrls[nextIdx]} opacity={transitioning ? 1 : 0} />}
        </>
      )}
      {/* Image courante */}
      <img
        key={`cur-${currentIdx}`}
        src={orderedUrls[currentIdx]}
        className='absolute inset-0 w-full h-full transition-opacity duration-1000'
        style={{
          objectFit: config.image_fit,
          opacity: transitioning ? 0 : 1,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: blurPx > 0 ? 'scale(1.05)' : undefined,
        }}
        alt=''
      />
      {/* Prochaine image (pré-chargée derrière) */}
      {orderedUrls.length > 1 && (
        <img
          key={`next-${nextIdx}`}
          src={orderedUrls[nextIdx]}
          className='absolute inset-0 w-full h-full transition-opacity duration-1000'
          style={{
            objectFit: config.image_fit,
            opacity: transitioning ? 1 : 0,
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            transform: blurPx > 0 ? 'scale(1.05)' : undefined,
          }}
          alt=''
        />
      )}
      {/* Vignette subtile pour améliorer la lisibilité des widgets */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

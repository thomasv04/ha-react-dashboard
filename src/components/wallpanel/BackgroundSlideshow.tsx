import { useState, useEffect, useCallback, useImperativeHandle, type Ref } from 'react';
import type { WallPanelConfig } from '@/types/wallpanel';
import { useResolvedMediaUrls } from '@/hooks/useResolvedMediaUrls';

/** Durée du fondu enchaîné, alignée sur `transition-opacity duration-1000`. */
const CROSSFADE_MS = 1000;

export interface SlideshowHandle {
  /** +1 = image suivante, -1 = précédente. Sans effet pendant un fondu. */
  go: (delta: number) => void;
}

interface BackgroundSlideshowProps {
  config: WallPanelConfig;
  ref?: Ref<SlideshowHandle>;
  /**
   * Nombre d'images après résolution. Une seule URL `media-source://` peut
   * désigner un album entier : l'appelant ne peut pas le déduire de la config,
   * et il en a besoin pour savoir si le balayage horizontal a un sens.
   */
  onCountChange?: (count: number) => void;
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

export function BackgroundSlideshow({ config, ref, onCountChange }: BackgroundSlideshowProps) {
  const resolvedUrls = useResolvedMediaUrls(config.image_urls);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [orderedUrls, setOrderedUrls] = useState<string[]>([]);

  // (Re)construire la liste ordonnée quand les URLs résolues ou l'ordre changent
  useEffect(() => {
    if (resolvedUrls.length === 0) return;
    const urls = config.media_order === 'random' ? shuffleArray(resolvedUrls) : [...resolvedUrls];
    setOrderedUrls(urls);
    setCurrentIdx(0);
    setNextIdx(Math.min(1, urls.length - 1));
  }, [resolvedUrls, config.media_order]);

  useEffect(() => onCountChange?.(resolvedUrls.length), [resolvedUrls.length, onCountChange]);

  /**
   * Avance ou recule d'une image. Le modulo est ramené dans le positif :
   * `-1 % 5` vaut `-1` en JavaScript, ce qui sortirait du tableau au premier
   * balayage vers l'arrière.
   */
  const go = useCallback(
    (delta: number) => {
      const total = orderedUrls.length;
      if (total <= 1 || transitioning) return;
      setNextIdx((((currentIdx + delta) % total) + total) % total);
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx(prev => (((prev + delta) % total) + total) % total);
        setTransitioning(false);
      }, CROSSFADE_MS);
    },
    [currentIdx, orderedUrls.length, transitioning]
  );

  useImperativeHandle(ref, () => ({ go }), [go]);

  // Défilement automatique. Un `setTimeout` réarmé à chaque image, et non un
  // `setInterval` : après un balayage manuel, l'image suivante bénéficie ainsi
  // d'une durée d'affichage complète au lieu du reliquat de l'intervalle.
  useEffect(() => {
    if (orderedUrls.length <= 1 || config.image_duration <= 0) return;
    const timer = setTimeout(() => go(1), config.image_duration * 1000);
    return () => clearTimeout(timer);
  }, [currentIdx, orderedUrls.length, config.image_duration, go]);

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

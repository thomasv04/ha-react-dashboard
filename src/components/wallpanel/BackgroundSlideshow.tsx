import { useState, useEffect, useCallback, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from 'react';
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

/**
 * Vidéo d'après l'URL : extension connue, ou chemin finissant par un type MIME
 * vidéo (`…/fullsize/video/mp4?authSig=…` chez Immich).
 */
export const isVideoUrl = (url: string) => /(\.(mp4|webm|mov|m4v)|\/video\/[\w+-]+)(\?|$)/i.test(url);

/** Une photo portrait cherche sa partenaire parmi les images qui la suivent, pas plus loin. */
const PAIR_LOOKAHEAD = 10;
/** Nombre d'images dont on mesure l'orientation d'avance : pas tout un album Immich. */
const PROBE_AHEAD = 30;
/** Une image qui ne répond pas ne doit pas bloquer la mesure des suivantes. */
const PROBE_TIMEOUT_MS = 3000;

/**
 * Regroupe les images en diapositives : deux portraits côte à côte (comme les
 * Google Home), les autres seules. `portrait` ne contient que les URLs déjà
 * mesurées — une image inconnue passe seule.
 */
export function groupSlides(urls: string[], portrait: ReadonlySet<string>): string[][] {
  const used = new Set<number>();
  const slides: string[][] = [];
  urls.forEach((url, i) => {
    if (used.has(i)) return;
    const j = portrait.has(url) ? urls.findIndex((u, k) => k > i && k <= i + PAIR_LOOKAHEAD && !used.has(k) && portrait.has(u)) : -1;
    if (j >= 0) used.add(j);
    slides.push(j >= 0 ? [url, urls[j]] : [url]);
  });
  return slides;
}

/** `true` si l'image est plus haute que large. Les vidéos ne sont jamais appariées. */
function probePortrait(url: string): Promise<boolean> {
  if (isVideoUrl(url)) return Promise.resolve(false);
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
    const done = (portrait: boolean) => {
      clearTimeout(timer);
      resolve(portrait);
    };
    img.onload = () => done(img.naturalHeight > img.naturalWidth);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/**
 * Une diapositive : vidéo muette en boucle, image, ou deux images côte à côte.
 * Muette, sinon le navigateur refuse la lecture automatique.
 */
function Slide({ srcs, style }: { srcs: string[]; style: CSSProperties }) {
  const className = 'absolute inset-0 w-full h-full transition-opacity duration-1000';
  if (srcs.length > 1) {
    return (
      <div className={`${className} flex gap-1`} style={style}>
        {srcs.map(src => (
          <img key={src} src={src} className='h-full min-w-0 flex-1' style={{ objectFit: style.objectFit }} alt='' />
        ))}
      </div>
    );
  }
  if (isVideoUrl(srcs[0])) return <VideoSlide src={srcs[0]} className={className} style={style} />;
  return <img src={srcs[0]} className={className} style={style} alt='' />;
}

/**
 * Vidéo muette en boucle. Une vidéo portrait sur un écran en paysage est
 * montrée en entier : `cover` la recadrait au tiers de sa hauteur pour remplir
 * la tablette. Les photos portrait, elles, sont appariées (`groupSlides`) — une
 * vidéo ne peut pas l'être. Les autres réglages d'ajustement restent ceux de
 * l'utilisateur.
 */
function VideoSlide({ src, className, style }: { src: string; className: string; style: CSSProperties }) {
  const [portrait, setPortrait] = useState(false);
  const fit = portrait && style.objectFit === 'cover' && window.innerWidth > window.innerHeight ? 'contain' : style.objectFit;
  return (
    <video
      src={src}
      className={className}
      style={{ ...style, objectFit: fit }}
      onLoadedMetadata={e => setPortrait(e.currentTarget.videoHeight > e.currentTarget.videoWidth)}
      autoPlay
      muted
      loop
      playsInline
    />
  );
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
  // URL → « portrait ? », rempli au fil de la mesure (voir l'effet plus bas).
  const probeCache = useRef(new Map<string, boolean>());
  const [probed, setProbed] = useState<ReadonlyMap<string, boolean>>(new Map());
  // Deux photos côte à côte n'ont de sens que sur un écran plus large que haut.
  const pairing = config.style.pairPortraits !== false && window.innerWidth > window.innerHeight;

  // Tant que les premières images ne sont pas mesurées, on n'affiche rien : les
  // apparier après coup changerait la diapositive sous les yeux.
  const slides = useMemo(() => {
    if (!pairing) return orderedUrls.map(u => [u]);
    if (!orderedUrls.slice(0, PAIR_LOOKAHEAD + 1).every(u => probed.has(u))) return [];
    return groupSlides(orderedUrls, new Set(orderedUrls.filter(u => probed.get(u))));
  }, [orderedUrls, probed, pairing]);

  // (Re)construire la liste ordonnée quand les URLs résolues ou l'ordre changent
  useEffect(() => {
    if (resolvedUrls.length === 0) return;
    const urls = config.media_order === 'random' ? shuffleArray(resolvedUrls) : [...resolvedUrls];
    setOrderedUrls(urls);
    setCurrentIdx(0);
    setNextIdx(Math.min(1, urls.length - 1));
  }, [resolvedUrls, config.media_order]);

  // Accolades, pas une expression : ce que renvoie le corps d'un effet, React
  // le prend pour la fonction de nettoyage et l'appelle au démontage. Ici c'est
  // le retour d'un rappel fourni par l'appelant — personne ne garantit qu'il ne
  // renvoie rien.
  useEffect(() => {
    onCountChange?.(resolvedUrls.length);
  }, [resolvedUrls.length, onCountChange]);

  /**
   * Avance ou recule d'une image. Le modulo est ramené dans le positif :
   * `-1 % 5` vaut `-1` en JavaScript, ce qui sortirait du tableau au premier
   * balayage vers l'arrière.
   */
  const go = useCallback(
    (delta: number) => {
      const total = slides.length;
      if (total <= 1 || transitioning) return;
      setNextIdx((((currentIdx + delta) % total) + total) % total);
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIdx(prev => (((prev + delta) % total) + total) % total);
        setTransitioning(false);
      }, CROSSFADE_MS);
    },
    [currentIdx, slides.length, transitioning]
  );

  useImperativeHandle(ref, () => ({ go }), [go]);

  // Défilement automatique. Un `setTimeout` réarmé à chaque image, et non un
  // `setInterval` : après un balayage manuel, l'image suivante bénéficie ainsi
  // d'une durée d'affichage complète au lieu du reliquat de l'intervalle.
  useEffect(() => {
    if (slides.length <= 1 || config.image_duration <= 0) return;
    const timer = setTimeout(() => go(1), config.image_duration * 1000);
    return () => clearTimeout(timer);
  }, [currentIdx, slides.length, config.image_duration, go]);

  // Mesure l'orientation des images à venir, une à la fois : un album entier
  // téléchargé d'un coup saturerait la tablette.
  const from = Math.max(0, orderedUrls.indexOf(slides[currentIdx]?.[0]));
  useEffect(() => {
    if (!pairing) return;
    let cancelled = false;
    void (async () => {
      for (const url of orderedUrls.slice(from, from + PROBE_AHEAD)) {
        if (probeCache.current.has(url)) continue;
        const portrait = await probePortrait(url);
        if (cancelled) return;
        probeCache.current.set(url, portrait);
        setProbed(new Map(probeCache.current));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderedUrls, from, pairing]);

  if (slides.length === 0) {
    return <div className='absolute inset-0 bg-[var(--ds-surface-1)]' />;
  }

  // Former un couple fait reculer le nombre de diapositives : l'index peut dépasser la fin.
  const cur = slides[currentIdx] ?? slides[0];
  const nxt = slides[nextIdx] ?? slides[0];
  const blurPx = config.style.backgroundBlur ?? 0;
  const containBg = config.image_fit === 'contain' && (config.style.containBlurBackground ?? false);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      {/* ── Blurred fill background (contain mode only) ── */}
      {containBg && (
        <>
          <BlurBg src={cur[0]} opacity={transitioning ? 0 : 1} />
          {slides.length > 1 && <BlurBg src={nxt[0]} opacity={transitioning ? 1 : 0} />}
        </>
      )}
      {/* Image courante */}
      <Slide
        key={`cur-${currentIdx}`}
        srcs={cur}
        style={{
          objectFit: config.image_fit,
          opacity: transitioning ? 0 : 1,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          transform: blurPx > 0 ? 'scale(1.05)' : undefined,
        }}
      />
      {/* Prochaine image (pré-chargée derrière) */}
      {slides.length > 1 && (
        <Slide
          key={`next-${nextIdx}`}
          srcs={nxt}
          style={{
            objectFit: config.image_fit,
            opacity: transitioning ? 1 : 0,
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            transform: blurPx > 0 ? 'scale(1.05)' : undefined,
          }}
        />
      )}
    </div>
  );
}

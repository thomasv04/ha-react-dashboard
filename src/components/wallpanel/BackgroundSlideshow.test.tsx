import { createRef } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundSlideshow, groupSlides, isVideoUrl, type SlideshowHandle } from './BackgroundSlideshow';
import { DEFAULT_WALLPANEL_CONFIG } from '@/types/wallpanel';

const URLS = ['/a.jpg', '/b.jpg', '/c.jpg'];

// Les URLs `media-source://` sont résolues par WebSocket : hors sujet ici, seul
// le parcours de la liste est testé.
const media = vi.hoisted(() => ({ urls: ['/a.jpg', '/b.jpg', '/c.jpg'] }));
vi.mock('@/hooks/useResolvedMediaUrls', () => ({ useResolvedMediaUrls: () => media.urls }));

// `image_duration: 0` coupe le défilement automatique — le test ne mesure que
// les déplacements demandés.
const config = {
  ...DEFAULT_WALLPANEL_CONFIG,
  image_urls: URLS,
  media_order: 'sequential' as const,
  image_duration: 0,
  // Mesurer l'orientation suppose de charger l'image, ce que jsdom ne fait pas.
  style: { ...DEFAULT_WALLPANEL_CONFIG.style, pairPortraits: false },
};

/** Image affichée : la première du DOM, celle dont l'opacité vaut 1 au repos. */
const currentSrc = (container: HTMLElement) => container.querySelector('img')?.getAttribute('src');

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('BackgroundSlideshow', () => {
  it('avance et revient en boucle sur les deux bords de la liste', () => {
    const ref = createRef<SlideshowHandle>();
    const { container } = render(<BackgroundSlideshow config={config} ref={ref} />);
    expect(currentSrc(container)).toBe('/a.jpg');

    // Reculer depuis la première image doit atteindre la dernière : `-1 % 3`
    // vaut `-1` en JavaScript, et sortirait du tableau sans modulo positif.
    act(() => ref.current!.go(-1));
    act(() => void vi.advanceTimersByTime(1000));
    expect(currentSrc(container)).toBe('/c.jpg');

    // Et avancer depuis la dernière doit revenir à la première.
    act(() => ref.current!.go(1));
    act(() => void vi.advanceTimersByTime(1000));
    expect(currentSrc(container)).toBe('/a.jpg');
  });

  it('ignore un déplacement demandé pendant un fondu', () => {
    const ref = createRef<SlideshowHandle>();
    const { container } = render(<BackgroundSlideshow config={config} ref={ref} />);

    act(() => ref.current!.go(1));
    act(() => ref.current!.go(1)); // en plein fondu — sans effet
    act(() => void vi.advanceTimersByTime(1000));

    expect(currentSrc(container)).toBe('/b.jpg');
  });

  it('signale le nombre d’images résolues', () => {
    const onCountChange = vi.fn();
    render(<BackgroundSlideshow config={config} onCountChange={onCountChange} />);
    expect(onCountChange).toHaveBeenCalledWith(3);
  });
});

describe('groupSlides', () => {
  it('apparie deux portraits, laisse les paysages et le portrait sans partenaire seuls', () => {
    const portrait = new Set(['/p1', '/p2', '/p3']);
    expect(groupSlides(['/p1', '/l1', '/p2', '/p3'], portrait)).toEqual([['/p1', '/p2'], ['/l1'], ['/p3']]);
  });

  it('ne va pas chercher une partenaire au-delà de la fenêtre', () => {
    const urls = ['/p1', ...Array.from({ length: 12 }, (_, i) => `/l${i}`), '/p2'];
    expect(groupSlides(urls, new Set(['/p1', '/p2']))).toHaveLength(urls.length);
  });

  it('traite une image non mesurée comme un paysage', () => {
    expect(groupSlides(['/a', '/b'], new Set())).toEqual([['/a'], ['/b']]);
  });
});

describe('BackgroundSlideshow — portraits', () => {
  const pairConfig = { ...config, style: { ...config.style, pairPortraits: true } };

  afterEach(() => vi.unstubAllGlobals());

  it('affiche deux portraits côte à côte, une fois mesurés', async () => {
    vi.useRealTimers();
    // `/c.jpg` est un paysage, `/a.jpg` et `/b.jpg` des portraits.
    class FakeImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      set src(url: string) {
        const landscape = url === '/c.jpg';
        this.naturalWidth = landscape ? 200 : 100;
        this.naturalHeight = landscape ? 100 : 200;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const { container } = render(<BackgroundSlideshow config={pairConfig} />);
    // La diapositive suivante (`/c.jpg`) est préchargée derrière : on ne regarde que la paire courante.
    await vi.waitFor(() => expect(container.querySelector('div > div img + img')).not.toBeNull());
    const pair = container.querySelectorAll('div.flex img');
    expect([...pair].map(i => i.getAttribute('src'))).toEqual(['/a.jpg', '/b.jpg']);
  });
});

describe('BackgroundSlideshow — vidéos', () => {
  const videoConfig = { ...config, image_fit: 'cover' as const };
  const dims = (video: HTMLVideoElement, width: number, height: number) => {
    Object.defineProperty(video, 'videoWidth', { value: width, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: height, configurable: true });
    fireEvent.loadedMetadata(video);
  };

  beforeEach(() => {
    media.urls = ['/clip.mp4'];
  });
  afterEach(() => {
    media.urls = URLS;
  });

  it('montre en entier une vidéo portrait sur un écran en paysage', () => {
    const { container } = render(<BackgroundSlideshow config={videoConfig} />);
    const video = container.querySelector('video')!;
    expect(video.style.objectFit).toBe('cover');
    dims(video, 720, 1280);
    expect(video.style.objectFit).toBe('contain');
  });

  it('garde le réglage de l’utilisateur pour une vidéo paysage', () => {
    const { container } = render(<BackgroundSlideshow config={videoConfig} />);
    const video = container.querySelector('video')!;
    dims(video, 1920, 1080);
    expect(video.style.objectFit).toBe('cover');
  });
});

describe('isVideoUrl', () => {
  it('reconnaît les vidéos Immich et les extensions vidéo, pas les images', () => {
    expect(isVideoUrl('/immich/e/a/fullsize/video/mp4?authSig=x')).toBe(true);
    expect(isVideoUrl('https://h/clip.MOV')).toBe(true);
    expect(isVideoUrl('/immich/e/a/fullsize/image/jpeg?authSig=x')).toBe(false);
    expect(isVideoUrl('/local/video/photo.jpg')).toBe(false);
  });
});

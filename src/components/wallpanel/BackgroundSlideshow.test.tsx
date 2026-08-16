import { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackgroundSlideshow, type SlideshowHandle } from './BackgroundSlideshow';
import { DEFAULT_WALLPANEL_CONFIG } from '@/types/wallpanel';

const URLS = ['/a.jpg', '/b.jpg', '/c.jpg'];

// Les URLs `media-source://` sont résolues par WebSocket : hors sujet ici, seul
// le parcours de la liste est testé.
vi.mock('@/hooks/useResolvedMediaUrls', () => ({ useResolvedMediaUrls: () => URLS }));

// `image_duration: 0` coupe le défilement automatique — le test ne mesure que
// les déplacements demandés.
const config = { ...DEFAULT_WALLPANEL_CONFIG, image_urls: URLS, media_order: 'sequential' as const, image_duration: 0 };

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

import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const mockUseCamera = vi.fn();

vi.mock('@hakit/core', () => ({
  useCamera: (entityId: string) => mockUseCamera(entityId),
  useHass: (selector: (s: { entities: Record<string, unknown> }) => unknown) =>
    selector({ entities: { 'camera.living_room': {}, 'camera.kitchen': {}, 'camera.unknown': {}, 'camera.front_door': {} } }),
}));

vi.mock('hls.js', () => ({
  default: { isSupported: () => false },
}));

const { CameraFeed } = await import('../components/CameraFeed');

describe('CameraFeed', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche une vidéo HLS quand stream.url est disponible', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    const onProtocol = vi.fn();
    const { container } = render(<CameraFeed entityId='camera.living_room' streamMode='hls' onProtocol={onProtocol} />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('affiche un flux MJPEG quand shouldRenderMJPEG est true', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: false, error: undefined },
      mjpeg: { url: 'https://ha/api/camera_proxy_stream/camera.kitchen?token=abc', shouldRenderMJPEG: true },
      poster: { url: undefined },
    });
    const onProtocol = vi.fn();
    const { container } = render(<CameraFeed entityId='camera.kitchen' onProtocol={onProtocol} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://ha/api/camera_proxy_stream/camera.kitchen?token=abc');
    expect(onProtocol).toHaveBeenCalledWith('MJPEG');
  });

  it('affiche une icône si aucune source disponible', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    const { container } = render(<CameraFeed entityId='camera.unknown' />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('fonctionne sans prop onProtocol', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    expect(() => render(<CameraFeed entityId='camera.living_room' />)).not.toThrow();
  });

  it('utilise HLS même si frontend_stream_types inclut web_rtc', () => {
    mockUseCamera.mockReturnValue({
      frontend_stream_types: ['hls', 'web_rtc'],
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    const { container } = render(<CameraFeed entityId='camera.front_door' streamMode='hls' />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="webrtc-feed"]')).not.toBeInTheDocument();
  });
});

describe('HLS — cible de l’observateur de visibilité', () => {
  afterEach(() => vi.clearAllMocks());

  it('garde la <video> montée avant que l’URL du flux ne soit résolue', () => {
    // Au premier rendu, `camera/stream` n'a pas encore répondu. Si la <video>
    // n'existe pas à ce moment, l'IntersectionObserver se pose sur `null` et
    // n'est jamais recréé : hls.js ne s'attache plus et la caméra reste grise.
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: true, error: undefined },
      mjpeg: { url: 'https://ha/api/camera_proxy_stream/camera.front_door?token=abc' },
      poster: { url: undefined },
    });
    const { container } = render(<CameraFeed entityId='camera.front_door' streamMode='hls' />);

    expect(container.querySelector('video')).toBeInTheDocument();
    // Le repli MJPEG s'affiche par-dessus en attendant.
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});

describe('HLS — voile de chargement', () => {
  afterEach(() => vi.clearAllMocks());

  it('affiche un indicateur tant que la première image n’est pas décodée', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    const { container } = render(<CameraFeed entityId='camera.living_room' streamMode='hls' />);

    // Une <video> noire est indiscernable d'une caméra en panne.
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('retire l’indicateur une fois la vidéo prête', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
      poster: { url: undefined },
    });
    const { container } = render(<CameraFeed entityId='camera.living_room' streamMode='hls' />);

    fireEvent.loadedData(container.querySelector('video')!);

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});

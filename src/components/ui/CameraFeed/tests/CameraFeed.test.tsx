import { render } from '@testing-library/react';
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
    });
    const onProtocol = vi.fn();
    const { container } = render(<CameraFeed entityId='camera.living_room' onProtocol={onProtocol} />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('affiche un flux MJPEG quand shouldRenderMJPEG est true', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: false, error: undefined },
      mjpeg: { url: 'https://ha/api/camera_proxy_stream/camera.kitchen?token=abc', shouldRenderMJPEG: true },
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
    });
    const { container } = render(<CameraFeed entityId='camera.unknown' />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('fonctionne sans prop onProtocol', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
    });
    expect(() => render(<CameraFeed entityId='camera.living_room' />)).not.toThrow();
  });

  it('utilise HLS même si frontend_stream_types inclut web_rtc', () => {
    mockUseCamera.mockReturnValue({
      frontend_stream_types: ['hls', 'web_rtc'],
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
    });
    const { container } = render(<CameraFeed entityId='camera.front_door' />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="webrtc-feed"]')).not.toBeInTheDocument();
  });
});

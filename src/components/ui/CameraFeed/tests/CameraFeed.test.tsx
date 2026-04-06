import { render } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const mockUseCamera = vi.fn();

vi.mock('@hakit/core', () => ({
  useCamera: (entityId: string) => mockUseCamera(entityId),
}));

vi.mock('hls.js', () => ({
  default: {
    isSupported: () => false,
  },
}));

// Import after mocks are set up
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
    const { container } = render(<CameraFeed entityId="camera.salon_frigate" />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('affiche un flux MJPEG quand shouldRenderMJPEG est true', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: false, error: undefined },
      mjpeg: { url: 'https://ha/api/camera_proxy_stream/camera.cuisine?token=abc', shouldRenderMJPEG: true },
    });
    const { container } = render(<CameraFeed entityId="camera.cuisine" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://ha/api/camera_proxy_stream/camera.cuisine?token=abc');
  });

  it('affiche une icône si ni stream ni mjpeg disponibles', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: undefined, loading: false, error: undefined },
      mjpeg: { url: undefined, shouldRenderMJPEG: false },
    });
    const { container } = render(<CameraFeed entityId="camera.unknown" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('préfère HLS sur MJPEG quand les deux sont disponibles', () => {
    mockUseCamera.mockReturnValue({
      stream: { url: 'https://ha/api/hls/token/master_playlist.m3u8', loading: false, error: undefined },
      mjpeg: { url: 'https://ha/api/camera_proxy_stream/camera.test?token=abc', shouldRenderMJPEG: false },
    });
    const { container } = render(<CameraFeed entityId="camera.salon_frigate" />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});

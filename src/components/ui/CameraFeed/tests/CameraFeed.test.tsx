import { render, waitFor } from '@testing-library/react';

import { describe, it, expect, vi, afterEach } from 'vitest';

describe('CameraFeed', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('utilise HA_URL vide explicite', async () => {
    const oldEnv = import.meta.env.VITE_HA_URL;
    import.meta.env.VITE_HA_URL = '';
    vi.resetModules();
    await vi.doMock('@hakit/core', () => ({
      useHass: (fn: any) =>
        fn({
          entities: {
            'camera.empty': { attributes: { entity_picture: '/api/camera_proxy/camera.empty?token=abc' } },
          },
        }),
    }));
    const { CameraFeed } = await import('../components/CameraFeed');
    const { container } = render(<CameraFeed entityId="camera.empty" />);
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('/api/camera_proxy_stream/camera.empty?token=abc'));
    });
    import.meta.env.VITE_HA_URL = oldEnv;
  });

  it('utilise HA_URL custom si défini', async () => {
    vi.resetModules();
    const oldEnv = import.meta.env.VITE_HA_URL;
    import.meta.env.VITE_HA_URL = 'https://custom-ha-url';
    await vi.doMock('@hakit/core', () => ({
      useHass: (fn: any) =>
        fn({
          entities: {
            'camera.custom': { attributes: { entity_picture: '/api/camera_proxy/camera.custom?token=abc' } },
          },
        }),
    }));
    const { CameraFeed } = await import('../components/CameraFeed');
    const { container } = render(<CameraFeed entityId="camera.custom" />);
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('https://custom-ha-url'));
    });
    import.meta.env.VITE_HA_URL = oldEnv;
  });

  it('affiche le flux MJPEG si entity_picture existe', async () => {
    vi.resetModules();
    await vi.doMock('@hakit/core', () => ({
      useHass: (fn: any) =>
        fn({
          entities: {
            'camera.test': { attributes: { entity_picture: '/api/camera_proxy/camera.test?token=abc' } },
          },
        }),
    }));
    const { CameraFeed } = await import('../components/CameraFeed');
    const { container } = render(<CameraFeed entityId="camera.test" />);
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', expect.stringContaining('/api/camera_proxy_stream/camera.test?token=abc'));
    });
  });

  it('affiche une icône si pas de entity_picture', async () => {
    vi.resetModules();
    await vi.doMock('@hakit/core', () => ({ useHass: () => undefined }));
    const { CameraFeed } = await import('../components/CameraFeed');
    render(<CameraFeed entityId="camera.unknown" />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('affiche le flux proxy si pas de token', async () => {
    vi.resetModules();
    await vi.doMock('@hakit/core', () => ({
      useHass: (fn: any) =>
        fn({
          entities: {
            'camera.notoken': { attributes: { entity_picture: '/api/camera_proxy/camera.notoken' } },
          },
        }),
    }));
    const { CameraFeed } = await import('../components/CameraFeed');
    const { container } = render(<CameraFeed entityId="camera.notoken" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('/api/camera_proxy/camera.notoken'));
  });

  it('utilise HA_URL vide si non défini', async () => {
    vi.resetModules();
    const oldEnv = import.meta.env.VITE_HA_URL;
    import.meta.env.VITE_HA_URL = undefined;
    await vi.doMock('@hakit/core', () => ({
      useHass: (fn: any) =>
        fn({
          entities: {
            'camera.env': { attributes: { entity_picture: '/api/camera_proxy/camera.env?token=abc' } },
          },
        }),
    }));
    const { CameraFeed } = await import('../components/CameraFeed');
    const { container } = render(<CameraFeed entityId="camera.env" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    import.meta.env.VITE_HA_URL = oldEnv;
  });
});

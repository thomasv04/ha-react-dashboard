import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const now = Math.floor(Date.now() / 1000);
const connection = vi.hoisted(() => ({
  socket: { url: 'wss://ha.example.org/api/websocket' },
  sendMessagePromise: (() => {}) as unknown as (msg: Record<string, unknown>) => Promise<unknown>,
}));
let config: Record<string, unknown> = {};

vi.mock('@hakit/core', () => ({
  useHass: (selector: (s: unknown) => unknown) =>
    selector({ connection, entities: { 'camera.entree': { state: 'idle', attributes: {} } } }),
}));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'events-1' }));
vi.mock('@/components/ui/CameraFeed/components/CameraFeed', () => ({
  CameraFeed: ({ entityId }: { entityId: string }) => <div>flux {entityId}</div>,
}));

import { CameraEventsCard } from './CameraEventsCard';

beforeEach(() => {
  config = {};
  connection.sendMessagePromise = vi.fn().mockResolvedValue([
    { id: 'e1', camera: 'entree', label: 'person', start_time: now - 120, has_clip: true },
    { id: 'e2', camera: 'entree', label: 'package', start_time: now - 600, has_clip: false },
  ]);
});

describe('CameraEventsCard', () => {
  it('demande à Frigate les événements de la fenêtre, pour les caméras choisies', async () => {
    config = { cameras: 'entree, jardin', hours: 6, instanceId: 'maison' };
    render(<CameraEventsCard />);
    await screen.findAllByRole('button');
    expect(connection.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frigate/events/get', instance_id: 'maison', cameras: ['entree', 'jardin'] })
    );
    const { after } = vi.mocked(connection.sendMessagePromise).mock.calls[0][0] as { after: number };
    expect(now - after).toBeGreaterThanOrEqual(6 * 3600 - 5);
  });

  it('montre les compteurs et les vignettes, et ouvre la caméra en plein écran', async () => {
    render(<CameraEventsCard />);
    const person = await screen.findByText('person');
    expect(screen.getByTitle('package')).toHaveTextContent('1');

    fireEvent.click(person);
    const viewer = screen.getByRole('dialog', { name: 'entree' });
    expect(viewer.querySelector('video')).toHaveAttribute('src', expect.stringContaining('/api/frigate/notifications/e1/clip.mp4'));

    fireEvent.click(screen.getByRole('button', { name: /widgets.camera_events.live/ }));
    expect(screen.getByText('flux camera.entree')).toBeInTheDocument();
  });

  it('dit quand Frigate ne répond pas', async () => {
    connection.sendMessagePromise = vi.fn().mockRejectedValue(new Error('unknown command'));
    render(<CameraEventsCard />);
    expect(await screen.findByText('widgets.camera_events.error')).toBeInTheDocument();
  });
});

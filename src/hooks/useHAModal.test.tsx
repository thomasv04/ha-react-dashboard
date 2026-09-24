import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const { callService, listeners } = vi.hoisted(() => ({
  callService: vi.fn(),
  listeners: {} as Record<string, (event: { data: unknown }) => void>,
}));

// Une connexion qui garde l'abonnement : le test émet l'événement lui-même.
vi.mock('@hakit/core', () => {
  const state = {
    connection: {
      subscribeEvents: (callback: (event: { data: unknown }) => void, type: string) => {
        listeners[type] = callback;
        return Promise.resolve(() => {});
      },
    },
    helpers: { callService },
  };
  return { useHass: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state) };
});

import { ModalProvider } from '@/context/ModalContext';
import { ThemeContextProvider } from '@/context/ThemeContext';
import { ModalContainer } from '@/components/ui/Modal/components/Modal';
import { useHAModal } from './useHAModal';

function Host() {
  useHAModal();
  return <ModalContainer />;
}

/** L'exemple de l'aide (Aide › Événements HA). */
const EXAMPLE = {
  title: 'Mise à jour disponible',
  content: 'Une nouvelle version est prête à être installée.',
  persistent: true,
  dismissible: false,
  actions: [
    { label: 'Installer', variant: 'primary', service: 'hassio.addon_update', service_data: { addon: 'ha-react-dashboard' } },
    { label: 'Plus tard' },
  ],
};

async function open() {
  render(
    <ThemeContextProvider>
      <ModalProvider>
        <Host />
      </ModalProvider>
    </ThemeContextProvider>
  );
  await act(async () => {});
  act(() => listeners.ha_dashboard_modal({ data: EXAMPLE }));
  expect(screen.getByText('Mise à jour disponible')).toBeInTheDocument();
}

describe('useHAModal', () => {
  it('calls the service of an action, then closes a persistent modal', async () => {
    await open();
    // `dismissible: false` : Échap ne la ferme pas.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Mise à jour disponible')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Installer'));
    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'hassio', service: 'addon_update', serviceData: { addon: 'ha-react-dashboard' } })
    );
    await waitFor(() => expect(screen.queryByText('Mise à jour disponible')).not.toBeInTheDocument());
  });

  it('closes it too on an action without a service', async () => {
    await open();
    fireEvent.click(screen.getByText('Plus tard'));
    await waitFor(() => expect(screen.queryByText('Mise à jour disponible')).not.toBeInTheDocument());
  });
});

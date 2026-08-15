import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const sendMessagePromise = vi.fn();

// Le store est hissé hors du sélecteur : reconstruire `connection` à chaque
// rendu en changerait l'identité, et l'effet du hook repartirait en boucle. Le
// vrai store zustand garde bien une référence stable.
const hassState = { connection: { sendMessagePromise } };

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => (typeof selector === 'function' ? selector(hassState) : hassState),
}));

import { useServiceResponse } from './useServiceResponse';

describe('useServiceResponse', () => {
  beforeEach(() => {
    sendMessagePromise.mockReset();
  });

  it('appelle le service avec return_response et expose la réponse', async () => {
    sendMessagePromise.mockResolvedValue({ response: { 'todo.courses': { items: [{ summary: 'Pain' }] } } });

    const { result } = renderHook(() =>
      useServiceResponse<{ items: { summary: string }[] }>({
        domain: 'todo',
        service: 'get_items',
        entityId: 'todo.courses',
        serviceData: { status: ['needs_action'] },
      })
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'todo',
      service: 'get_items',
      target: { entity_id: ['todo.courses'] },
      service_data: { status: ['needs_action'] },
      // Sans ce drapeau, HA renvoie un contexte vide : c'est toute la raison
      // d'être du hook.
      return_response: true,
    });
    expect(result.current.data?.['todo.courses'].items[0].summary).toBe('Pain');
    expect(result.current.error).toBeNull();
  });

  it('cible plusieurs entités en un seul appel', async () => {
    sendMessagePromise.mockResolvedValue({ response: {} });

    renderHook(() => useServiceResponse({ domain: 'calendar', service: 'get_events', entityId: ['calendar.perso', 'calendar.boulot'] }));

    await waitFor(() => expect(sendMessagePromise).toHaveBeenCalled());
    expect(sendMessagePromise.mock.calls[0][0].target).toEqual({ entity_id: ['calendar.perso', 'calendar.boulot'] });
  });

  it("n'appelle rien sans cible", async () => {
    const { result } = renderHook(() => useServiceResponse({ domain: 'todo', service: 'get_items', entityId: [] }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it('remonte une erreur de service sans casser la card', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMessagePromise.mockRejectedValue(new Error('service not found'));

    const { result } = renderHook(() => useServiceResponse({ domain: 'todo', service: 'get_items', entityId: 'todo.courses' }));

    await waitFor(() => expect(result.current.error).toBe('service not found'));
    expect(result.current.data).toBeNull();
  });
});

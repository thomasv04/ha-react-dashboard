import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const sendMessagePromise = vi.fn();
const hassState = { connection: { sendMessagePromise } };

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => (typeof selector === 'function' ? selector(hassState) : hassState),
}));

import { useEntityHistory } from './useEntityHistory';

describe('useEntityHistory', () => {
  beforeEach(() => {
    sendMessagePromise.mockReset();
  });

  it("suit un attribut numérique quand l'état n'est pas un nombre", async () => {
    // Une entité weather : l'état reste « cloudy », seule la température bouge,
    // et HA ne répète pas les attributs inchangés.
    sendMessagePromise.mockResolvedValue({
      'weather.maison': [
        { s: 'cloudy', lu: 1000, a: { temperature: 18.5, humidity: 90 } },
        { s: 'cloudy', lu: 2000 },
        { s: 'cloudy', lu: 3000, a: { temperature: 17 } },
      ],
    });

    const { result } = renderHook(() => useEntityHistory('weather.maison', 24, 60_000, 'temperature'));

    await waitFor(() => expect(result.current.data).toHaveLength(3));

    expect(result.current.data.map(p => p.value)).toEqual([18.5, 18.5, 17]);
    expect(result.current.data.map(p => p.time.getTime())).toEqual([1_000_000, 2_000_000, 3_000_000]);
    // Sans attributs, le graphe météo n'a rien à tracer.
    expect(sendMessagePromise.mock.calls[0][0]).toMatchObject({
      minimal_response: false,
      no_attributes: false,
      significant_changes_only: false,
    });
  });

  it("lit l'état et ignore les points non numériques", async () => {
    sendMessagePromise.mockResolvedValue({
      'sensor.temp': [
        { s: '20', lu: 1000 },
        { s: 'unavailable', lu: 2000 },
        { s: '21', lu: 3000 },
      ],
    });

    const { result } = renderHook(() => useEntityHistory('sensor.temp', 24, 60_000));

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data.map(p => p.value)).toEqual([20, 21]);
  });
});

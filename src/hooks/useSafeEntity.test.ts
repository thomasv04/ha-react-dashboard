import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSafeEntity } from './useSafeEntity';

// ── Mock @hakit/core ────────────────────────────────────────────────────────────

let entityStore: Record<string, { state: string; attributes: Record<string, unknown> } | undefined> = {};
let selector: ((s: { entities: typeof entityStore }) => unknown) | null = null;

vi.mock('@hakit/core', () => ({
  useHass: (sel: (s: { entities: typeof entityStore }) => unknown) => {
    selector = sel;
    return sel({ entities: entityStore });
  },
}));

beforeEach(() => {
  entityStore = {};
  selector = null;
});

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('useSafeEntity', () => {
  it('returns null when the entity does not exist', () => {
    entityStore = {};
    const { result } = renderHook(() => useSafeEntity('sensor.missing'));
    expect(result.current).toBeNull();
  });

  it('returns { state, attributes } when the entity exists', () => {
    entityStore = {
      'light.salon': { state: 'on', attributes: { brightness: 200, color_mode: 'hs' } },
    };
    const { result } = renderHook(() => useSafeEntity('light.salon'));
    expect(result.current).toEqual({
      state: 'on',
      attributes: { brightness: 200, color_mode: 'hs' },
    });
  });

  it('does not re-render when attributes are shallowly equal', () => {
    entityStore = {
      'sensor.temp': { state: '22', attributes: { unit: '°C' } },
    };
    const { result, rerender } = renderHook(() => useSafeEntity('sensor.temp'));
    const first = result.current;

    // Rerender with a new object but identical values
    entityStore = {
      'sensor.temp': { state: '22', attributes: { unit: '°C' } },
    };
    rerender();

    // Should be the exact same reference (no unnecessary re-render)
    expect(result.current).toBe(first);
  });

  it('updates when state changes', () => {
    entityStore = {
      'switch.garage': { state: 'off', attributes: { friendly_name: 'Garage' } },
    };
    const { result, rerender } = renderHook(() => useSafeEntity('switch.garage'));
    expect(result.current?.state).toBe('off');

    entityStore = {
      'switch.garage': { state: 'on', attributes: { friendly_name: 'Garage' } },
    };
    rerender();
    expect(result.current?.state).toBe('on');
  });

  it('updates when an attribute changes', () => {
    entityStore = {
      'light.bureau': { state: 'on', attributes: { brightness: 100 } },
    };
    const { result, rerender } = renderHook(() => useSafeEntity('light.bureau'));
    const first = result.current;

    entityStore = {
      'light.bureau': { state: 'on', attributes: { brightness: 200 } },
    };
    rerender();

    expect(result.current).not.toBe(first);
    expect(result.current?.attributes.brightness).toBe(200);
  });
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHeldValue } from './useHeldValue';

describe('useHeldValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('garde la valeur du geste malgré HA, puis lui rend la main', () => {
    const { result, rerender } = renderHook(({ ha }) => useHeldValue(ha, 3000), { initialProps: { ha: 10 } });
    expect(result.current[0]).toBe(10);

    act(() => result.current[1](60));
    rerender({ ha: 20 }); // le volet remonte sa position en route
    expect(result.current[0]).toBe(60);

    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current[1](65)); // un nouveau geste relance le délai
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current[0]).toBe(65);

    act(() => vi.advanceTimersByTime(600));
    expect(result.current[0]).toBe(20);
  });
});

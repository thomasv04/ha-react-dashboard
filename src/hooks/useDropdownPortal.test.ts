import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDropdownPortal } from './useDropdownPortal';

/** Un déclencheur de 30 px de haut, dont le haut est à `top`. */
const trigger = (top: number) =>
  ({ getBoundingClientRect: () => ({ top, bottom: top + 30, left: 100, width: 200 }) }) as unknown as HTMLElement;

describe('useDropdownPortal', () => {
  it('opens below its trigger when there is room', () => {
    const { result } = renderHook(() => useDropdownPortal<HTMLElement>());
    result.current.triggerRef.current = trigger(100);
    act(() => result.current.show());

    expect(result.current.open).toBe(true);
    expect(result.current.dropStyle).toMatchObject({ top: 134, left: 100, width: 200 });
    expect(result.current.dropStyle.bottom).toBeUndefined();
  });

  it('opens upward near the bottom of the screen, where it would be cut off', () => {
    const { result } = renderHook(() => useDropdownPortal<HTMLElement>());
    result.current.triggerRef.current = trigger(window.innerHeight - 60);
    act(() => result.current.show());

    expect(result.current.dropStyle).toMatchObject({ bottom: 64 });
    expect(result.current.dropStyle.top).toBeUndefined();
  });

  it('stays open when shown twice — safe in a StrictMode effect', () => {
    const { result } = renderHook(() => useDropdownPortal<HTMLElement>());
    result.current.triggerRef.current = trigger(100);
    act(() => {
      result.current.show();
      result.current.show();
    });
    expect(result.current.open).toBe(true);
  });
});

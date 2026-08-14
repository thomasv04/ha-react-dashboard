import { renderHook, act } from '@testing-library/react';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { useLongPress } from './useLongPress';

/** Événement pointeur minimal — seules les coordonnées et le bouton comptent. */
const ptr = (x: number, y: number) => ({ button: 0, clientX: x, clientY: y }) as React.PointerEvent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('déclenche après la durée quand le pointeur ne bouge pas', () => {
  const onLongPress = vi.fn();
  const { result } = renderHook(() => useLongPress(onLongPress, 500));

  act(() => result.current.handlers.onPointerDown(ptr(100, 100)));
  act(() => result.current.handlers.onPointerMove(ptr(103, 102))); // sous le seuil
  act(() => void vi.advanceTimersByTime(500));

  expect(onLongPress).toHaveBeenCalledTimes(1);
  expect(result.current.moved.current).toBe(false);
});

test("un glissement annule l'appui long et marque le geste", () => {
  const onLongPress = vi.fn();
  const { result } = renderHook(() => useLongPress(onLongPress, 500));

  // Régler la jauge d'un thermostat : pointeur maintenu, mais qui glisse.
  act(() => result.current.handlers.onPointerDown(ptr(100, 100)));
  act(() => result.current.handlers.onPointerMove(ptr(140, 100)));
  act(() => void vi.advanceTimersByTime(2000));

  expect(onLongPress).not.toHaveBeenCalled();
  // `moved` survit au relâchement : le `click` de fin de geste est filtrable.
  act(() => result.current.handlers.onPointerUp());
  expect(result.current.moved.current).toBe(true);
});

test('un nouvel appui repart de zéro', () => {
  const onLongPress = vi.fn();
  const { result } = renderHook(() => useLongPress(onLongPress, 500));

  act(() => result.current.handlers.onPointerDown(ptr(0, 0)));
  act(() => result.current.handlers.onPointerMove(ptr(100, 0)));
  act(() => result.current.handlers.onPointerUp());
  expect(result.current.moved.current).toBe(true);

  act(() => result.current.handlers.onPointerDown(ptr(0, 0)));
  expect(result.current.moved.current).toBe(false);
  act(() => void vi.advanceTimersByTime(500));
  expect(onLongPress).toHaveBeenCalledTimes(1);
});

test('ignore le bouton secondaire', () => {
  const onLongPress = vi.fn();
  const { result } = renderHook(() => useLongPress(onLongPress, 500));

  act(() => result.current.handlers.onPointerDown({ button: 2, clientX: 0, clientY: 0 } as React.PointerEvent));
  act(() => void vi.advanceTimersByTime(500));

  expect(onLongPress).not.toHaveBeenCalled();
});

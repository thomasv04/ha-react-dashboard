import { renderHook, act } from '@testing-library/react';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { useAutoSave } from './useAutoSave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Une promesse qu'on résout à la main, pour tenir une requête « en vol ». */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return { promise, resolve };
}

const setup = (save: (v: { n: number }) => Promise<boolean>, delay = 800) =>
  renderHook(({ value }) => useAutoSave({ value, save, delay }), { initialProps: { value: { n: 0 } } });

test("rien ne part tant que la valeur n'a pas bougé", async () => {
  const save = vi.fn(async () => true);
  const { result } = setup(save);
  await act(async () => void vi.advanceTimersByTime(5000));
  expect(save).not.toHaveBeenCalled();
  expect(result.current.status).toBe('saved');
  expect(result.current.isBusy()).toBe(false);
});

test('une rafale de modifications ne fait partir que la dernière, après le délai', async () => {
  const save = vi.fn(async () => true);
  const { result, rerender } = setup(save);

  rerender({ value: { n: 1 } });
  expect(result.current.status).toBe('pending');
  expect(result.current.isBusy()).toBe(true);
  await act(async () => void vi.advanceTimersByTime(500));
  rerender({ value: { n: 2 } });
  await act(async () => void vi.advanceTimersByTime(500));
  rerender({ value: { n: 3 } });
  await act(async () => void vi.advanceTimersByTime(799));
  expect(save).not.toHaveBeenCalled();

  await act(async () => void vi.advanceTimersByTime(1));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({ n: 3 });
  expect(result.current.status).toBe('saved');
  expect(result.current.lastSaved).toEqual({ n: 3 });
});

test('revenir à la valeur enregistrée annule l’envoi', async () => {
  const save = vi.fn(async () => true);
  const { result, rerender } = setup(save);
  rerender({ value: { n: 1 } });
  rerender({ value: { n: 0 } });
  await act(async () => void vi.advanceTimersByTime(2000));
  expect(save).not.toHaveBeenCalled();
  expect(result.current.status).toBe('saved');
});

test('est « en cours » pendant la requête', async () => {
  const pending = deferred<boolean>();
  const save = vi.fn(() => pending.promise);
  const { result, rerender } = setup(save);

  rerender({ value: { n: 1 } });
  await act(async () => void vi.advanceTimersByTime(800));
  expect(result.current.status).toBe('saving');
  expect(result.current.isBusy()).toBe(true);

  await act(async () => pending.resolve(true));
  expect(result.current.status).toBe('saved');
  expect(result.current.isBusy()).toBe(false);
});

test('une modification pendant la requête repart après elle, sans requête concurrente', async () => {
  const first = deferred<boolean>();
  const save = vi
    .fn()
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValue(true);
  const { result, rerender } = setup(save);

  rerender({ value: { n: 1 } });
  await act(async () => void vi.advanceTimersByTime(800));
  rerender({ value: { n: 2 } });
  await act(async () => void vi.advanceTimersByTime(2000));
  expect(save).toHaveBeenCalledTimes(1);

  await act(async () => first.resolve(true));
  expect(result.current.status).toBe('pending');
  await act(async () => void vi.advanceTimersByTime(800));
  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith({ n: 2 });
  expect(result.current.status).toBe('saved');
});

test("un échec s'arrête là, et « Réessayer » renvoie la valeur courante", async () => {
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  const { result, rerender } = setup(save);

  rerender({ value: { n: 1 } });
  await act(async () => void vi.advanceTimersByTime(800));
  expect(result.current.status).toBe('error');
  expect(result.current.isBusy()).toBe(true);

  // Pas de nouvelle tentative toute seule.
  await act(async () => void vi.advanceTimersByTime(10_000));
  expect(save).toHaveBeenCalledTimes(1);

  let ok = false;
  await act(async () => void (ok = await result.current.retry()));
  expect(ok).toBe(true);
  expect(save).toHaveBeenCalledTimes(2);
  expect(result.current.status).toBe('saved');
});

test('une requête qui lève une exception compte comme un échec', async () => {
  const save = vi.fn().mockRejectedValue(new Error('réseau'));
  const { result, rerender } = setup(save);
  rerender({ value: { n: 1 } });
  await act(async () => void vi.advanceTimersByTime(800));
  expect(result.current.status).toBe('error');
});

test('flush envoie tout de suite, sans attendre le délai', async () => {
  const save = vi.fn(async () => true);
  const { result, rerender } = setup(save);
  rerender({ value: { n: 1 } });

  let ok = false;
  await act(async () => void (ok = await result.current.flush()));
  expect(ok).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);

  // Le délai ne renvoie pas une seconde fois.
  await act(async () => void vi.advanceTimersByTime(2000));
  expect(save).toHaveBeenCalledTimes(1);
});

test('flush sans rien en attente répond tout de suite', async () => {
  const save = vi.fn(async () => true);
  const { result } = setup(save);
  let ok = false;
  await act(async () => void (ok = await result.current.flush()));
  expect(ok).toBe(true);
  expect(save).not.toHaveBeenCalled();
});

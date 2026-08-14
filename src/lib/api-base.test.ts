/**
 * Un jeton d'accès Home Assistant vit trente minutes. Le client en gardait une
 * copie prise au montage : revenir sur l'onglet une demi-heure plus tard
 * envoyait un jeton périmé, tout repartait en 401 et l'écran de chargement
 * tournait sans fin.
 */
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import { apiFetch, setPanelAuth, isPanelMode } from './api-base';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  setPanelAuth(undefined);
  vi.unstubAllGlobals();
});

const authHeader = (call: number) => (fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>;

test('interroge le fournisseur à chaque appel, sans mémoriser le jeton', async () => {
  const tokens = ['jeton-1', 'jeton-2'];
  setPanelAuth(async () => tokens.shift());
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

  await apiFetch('/api/config');
  await apiFetch('/api/config');

  expect(authHeader(0).Authorization).toBe('Bearer jeton-1');
  expect(authHeader(1).Authorization).toBe('Bearer jeton-2');
});

test('sur 401, force un renouvellement et rejoue une fois', async () => {
  const provider = vi.fn(async (force?: boolean) => (force ? 'jeton-neuf' : 'jeton-perime'));
  setPanelAuth(provider);
  fetchMock.mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('{}', { status: 200 }));

  const res = await apiFetch('/api/settings/current');

  expect(res.status).toBe(200);
  expect(provider.mock.calls[0]).toEqual([]); // premier essai : pas de forçage
  expect(provider).toHaveBeenNthCalledWith(2, true);
  expect(authHeader(0).Authorization).toBe('Bearer jeton-perime');
  expect(authHeader(1).Authorization).toBe('Bearer jeton-neuf');
});

test("ne réessaie qu'une fois : un vrai refus doit remonter", async () => {
  setPanelAuth(async () => 'jeton');
  fetchMock.mockResolvedValue(new Response('', { status: 401 }));

  const res = await apiFetch('/api/config');

  expect(res.status).toBe(401);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('hors mode carte, aucun en-tête ni réessai', async () => {
  expect(isPanelMode()).toBe(false);
  fetchMock.mockResolvedValue(new Response('', { status: 401 }));

  await apiFetch('/api/config');

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1]).toEqual({});
});

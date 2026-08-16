import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationProvider, useNotifications } from './NotificationContext';

const STORAGE_KEY = 'ha-dashboard-notifications';

const setup = () => renderHook(() => useNotifications(), { wrapper: NotificationProvider });

beforeEach(() => localStorage.clear());

describe('NotificationContext', () => {
  it('empile les notifications, la plus récente en tête', () => {
    const { result } = setup();

    act(() => void result.current.notify({ message: 'première' }));
    act(() => void result.current.notify({ message: 'seconde' }));

    expect(result.current.notifications.map(n => n.message)).toEqual(['seconde', 'première']);
  });

  it("remplace au lieu d'empiler quand l'id est identique", () => {
    const { result } = setup();

    act(() => void result.current.notify({ id: 'maj', message: 'v1 disponible' }));
    act(() => void result.current.notify({ id: 'maj', message: 'v2 disponible' }));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('v2 disponible');
  });

  it('efface une notification, ou toutes', () => {
    const { result } = setup();

    act(() => void result.current.notify({ id: 'a', message: 'a' }));
    act(() => void result.current.notify({ id: 'b', message: 'b' }));
    act(() => result.current.dismiss('a'));
    expect(result.current.notifications.map(n => n.id)).toEqual(['b']);

    act(() => result.current.dismissAll());
    expect(result.current.notifications).toEqual([]);
  });

  it('survit à un rechargement, effacements compris', () => {
    const { result: first } = setup();
    act(() => void first.current.notify({ id: 'a', message: 'a' }));
    act(() => void first.current.notify({ id: 'b', message: 'b' }));
    act(() => first.current.dismiss('a'));

    // Nouveau provider = nouvelle page : l'état doit venir du stockage local.
    const second = setup();
    expect(second.result.current.notifications.map(n => n.id)).toEqual(['b']);
  });

  it('ignore un stockage corrompu au lieu de planter au démarrage', () => {
    localStorage.setItem(STORAGE_KEY, '{ pas du JSON');
    expect(setup().result.current.notifications).toEqual([]);

    // Forme valide mais entrées inutilisables : seules celles qui ont un `id` et
    // un `message` sont conservées.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'ok', message: 'ok' }, { nope: true }, null]));
    expect(setup().result.current.notifications.map(n => n.id)).toEqual(['ok']);
  });
});

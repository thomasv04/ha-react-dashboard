import { act, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallPanelProvider, useWallPanel } from '@/context/WallPanelContext';
import { DEFAULT_WALLPANEL_CONFIG, type WallPanelConfig } from '@/types/wallpanel';
import { IdleWatcher, ScreensaverEntityWatcher } from './ScreensaverWatchers';

// État de l'entité HA, piloté par chaque test.
const hass = vi.hoisted(() => ({ state: 'off' as string | null }));

vi.mock('@/hooks/useSafeEntity', async () => {
  const { useSyncExternalStore } = await import('react');
  const listeners = new Set<() => void>();
  (hass as { emit?: () => void }).emit = () => listeners.forEach(l => l());
  return {
    useSafeEntity: (entityId: string) => {
      const state = useSyncExternalStore(
        l => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        () => hass.state
      );
      return entityId && state ? { state, attributes: {} } : null;
    },
  };
});

function setEntity(state: string) {
  act(() => {
    hass.state = state;
    (hass as unknown as { emit: () => void }).emit();
  });
}

const CONFIG: WallPanelConfig = {
  ...DEFAULT_WALLPANEL_CONFIG,
  enabled: true,
  idle_time: 60,
  screensaver_entity: 'input_boolean.veille',
};

// Relevé du contexte, écrit depuis un effet (jamais pendant le rendu).
const probe = { active: false, deactivate: () => {} };
function Probe() {
  const ctx = useWallPanel();
  useEffect(() => {
    probe.active = ctx.isActive;
    probe.deactivate = ctx.deactivate;
  });
  return null;
}

function mount(config: WallPanelConfig = CONFIG) {
  return render(
    <WallPanelProvider initialConfig={config}>
      <IdleWatcher />
      <ScreensaverEntityWatcher />
      <Probe />
    </WallPanelProvider>
  );
}

const touch = () => act(() => void fireEvent.touchStart(window));
const wait = (s: number) => act(() => void vi.advanceTimersByTime(s * 1000));

describe('ScreensaverWatchers — issue #46', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hass.state = 'off';
    probe.active = false;
  });
  afterEach(() => vi.useRealTimers());

  it("garde la veille par inactivité quand l'entité reste sur off", () => {
    mount();
    expect(probe.active).toBe(false);

    wait(61);
    expect(probe.active).toBe(true);

    // Rien ne bouge côté HA : la veille doit tenir.
    wait(10);
    expect(probe.active).toBe(true);
  });

  it("laisse quitter la veille au toucher quand l'entité reste sur on", () => {
    hass.state = 'on';
    mount();
    expect(probe.active).toBe(true);

    // Sortie depuis la tablette : c'est ce que fait l'overlay au toucher.
    act(() => probe.deactivate());
    expect(probe.active).toBe(false);

    // L'entité n'a pas bougé : la veille ne doit pas se relancer d'elle-même.
    wait(1);
    expect(probe.active).toBe(false);
  });

  it('suit les transitions de l’entité : on active, off désactive', () => {
    mount();
    setEntity('on');
    expect(probe.active).toBe(true);
    setEntity('off');
    expect(probe.active).toBe(false);
  });

  it("ne coupe pas la veille quand l'entité passe par unavailable puis off", () => {
    mount();
    wait(61);
    expect(probe.active).toBe(true);
    setEntity('unavailable');
    setEntity('off');
    expect(probe.active).toBe(true);
  });

  it('le toucher hors veille réarme bien le minuteur', () => {
    mount();
    wait(50);
    touch();
    wait(50);
    expect(probe.active).toBe(false);
    wait(11);
    expect(probe.active).toBe(true);
  });
});

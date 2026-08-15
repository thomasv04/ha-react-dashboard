import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, tArray: () => [], language: 'fr' }),
}));

const config = { type: 'clock', showAnalog: false, showSeconds: false, showDate: true, hour12: false };

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ getWidgetConfig: () => config }),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'clock',
}));

import { ClockCard } from './ClockCard';

describe('ClockCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 10:30:20 — volontairement à 20 s d'une frontière de minute.
    vi.setSystemTime(new Date(2026, 0, 15, 10, 30, 20));
  });
  afterEach(() => vi.useRealTimers());

  it('affiche l’heure courante', () => {
    render(<ClockCard />);
    expect(screen.getByText('10:30')).toBeDefined();
  });

  it('se recale sur la frontière de minute au lieu de dériver', () => {
    render(<ClockCard />);

    // 39 s : la minute n'a pas encore tourné. Un `setInterval(60_000)` posé au
    // montage n'aurait lui non plus rien fait — c'est le pas suivant qui sépare
    // les deux comportements.
    act(() => void vi.advanceTimersByTime(39_000));
    expect(screen.getByText('10:30')).toBeDefined();

    // 40 s après le montage on franchit 10:31:00 pile. Un intervalle non recalé
    // n'aurait basculé qu'à 10:31:20.
    act(() => void vi.advanceTimersByTime(1_000));
    expect(screen.getByText('10:31')).toBeDefined();
  });

  it('affiche les secondes quand la config le demande', () => {
    config.showSeconds = true;
    try {
      render(<ClockCard />);
      expect(screen.getByText('10:30:20')).toBeDefined();
      act(() => void vi.advanceTimersByTime(1_000));
      expect(screen.getByText('10:30:21')).toBeDefined();
    } finally {
      config.showSeconds = false;
    }
  });
});

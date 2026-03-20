import { describe, it, expect, vi } from 'vitest';
import { resolveBreakpoint, WIDGET_LABELS } from './DashboardGrid';

// Mock all dependencies that require browser/HA context
vi.mock('@hakit/core', () => ({ useHass: vi.fn() }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_t, _tag) => (p: Record<string, unknown>) => p.children }),
  AnimatePresence: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(),
  WIDGET_LABELS: {
    activity: 'Activité',
    greeting: 'Horloge',
    camera: 'Caméra',
    weather: 'Météo',
    thermostat: 'Thermostat',
    rooms: 'Pièces',
    shortcuts: 'Raccourcis',
    tempo: 'Tempo EDF',
    energy: 'Énergie',
  },
}));

describe('resolveBreakpoint()', () => {
  it('retourne "lg" pour ≥1200px', () => {
    expect(resolveBreakpoint(1200)).toBe('lg');
    expect(resolveBreakpoint(1440)).toBe('lg');
    expect(resolveBreakpoint(1920)).toBe('lg');
  });

  it('retourne "md" pour 768–1199px', () => {
    expect(resolveBreakpoint(768)).toBe('md');
    expect(resolveBreakpoint(1024)).toBe('md');
    expect(resolveBreakpoint(1199)).toBe('md');
  });

  it('retourne "sm" pour <768px', () => {
    expect(resolveBreakpoint(767)).toBe('sm');
    expect(resolveBreakpoint(375)).toBe('sm');
    expect(resolveBreakpoint(0)).toBe('sm');
  });

  it('respecte exactement les frontières', () => {
    expect(resolveBreakpoint(1199)).toBe('md');
    expect(resolveBreakpoint(1200)).toBe('lg');
    expect(resolveBreakpoint(767)).toBe('sm');
    expect(resolveBreakpoint(768)).toBe('md');
  });
});

describe('WIDGET_LABELS', () => {
  const KNOWN_TYPES = ['activity', 'greeting', 'camera', 'weather', 'thermostat', 'rooms', 'shortcuts', 'tempo', 'energy'];

  it('a une entrée pour chaque type de widget connu', () => {
    for (const type of KNOWN_TYPES) {
      expect(WIDGET_LABELS[type]).toBeDefined();
      expect(WIDGET_LABELS[type].trim()).not.toBe('');
    }
  });

  it('les labels sont des chaînes non vides', () => {
    for (const label of Object.values(WIDGET_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

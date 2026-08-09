import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom n'implémente pas ResizeObserver, dont dépend `useWidgetSize` (donc
// toutes les cards responsives). Sans ce stub, le montage lève dans un effet et
// le test échoue avant d'avoir rien assert. Les dimensions restent à 0 : les
// cards rendent leur disposition par défaut, ce que les tests attendent.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Global mock for i18n — provides identity t() for tests that don't mock it themselves
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    tArray: (key: string) => [key],
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

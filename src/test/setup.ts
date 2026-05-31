import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mock for i18n — provides identity t() for tests that don't mock it themselves
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    tArray: (key: string) => [key],
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

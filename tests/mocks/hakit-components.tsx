/**
 * Mock for @hakit/components — used for Playwright dashboard E2E tests.
 * ThemeProvider passes children through (unlike Storybook version which returns null).
 */
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function HassConnect({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

/**
 * Mock for @hakit/components — used exclusively in Storybook.
 */
import React from 'react';

export function ThemeProvider() {
  return null;
}

export function HassConnect({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

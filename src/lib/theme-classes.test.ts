import { test, expect, afterEach } from 'vitest';
import { mirrorThemeClasses } from './theme-classes';

const html = document.documentElement;

afterEach(() => {
  html.className = '';
  delete html.dataset.theme;
});

test('le conteneur de la shadow root suit les classes de thème de <html>, et seulement elles', async () => {
  html.className = 'theme-clay theme-sea-glass perf-reduce-blur ha-foreign';
  html.dataset.theme = 'light';
  const target = document.createElement('div');
  target.className = 'app-own';
  const stop = mirrorThemeClasses(target);

  expect([...target.classList].sort()).toEqual(['app-own', 'perf-reduce-blur', 'theme-clay', 'theme-sea-glass']);
  expect(target.dataset.theme).toBe('light');

  // Changement de thème : l'ancienne classe part, la nouvelle arrive.
  html.className = 'theme-sea-glass theme-sea-glass-dark';
  html.dataset.theme = 'dark';
  await Promise.resolve();
  expect([...target.classList].sort()).toEqual(['app-own', 'theme-sea-glass', 'theme-sea-glass-dark']);
  expect(target.dataset.theme).toBe('dark');

  stop();
});

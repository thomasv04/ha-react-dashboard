import { test, expect } from 'vitest';
import { edgeScrollSpeed } from './useGridDragDrop';

// Fenêtre fictive de 800 px de haut, bande sensible de 90 px par défaut.
const TOP = 0;
const BOTTOM = 800;

test('pas de défilement au milieu de la zone', () => {
  expect(edgeScrollSpeed(400, TOP, BOTTOM)).toBe(0);
  expect(edgeScrollSpeed(TOP + 90, TOP, BOTTOM)).toBe(0);
  expect(edgeScrollSpeed(BOTTOM - 90, TOP, BOTTOM)).toBe(0);
});

test('défile vers le haut dans la bande haute, vers le bas dans la bande basse', () => {
  expect(edgeScrollSpeed(TOP + 45, TOP, BOTTOM)).toBeLessThan(0);
  expect(edgeScrollSpeed(BOTTOM - 45, TOP, BOTTOM)).toBeGreaterThan(0);
});

test('accélère en approchant du bord et sature au-delà', () => {
  const near = Math.abs(edgeScrollSpeed(TOP + 80, TOP, BOTTOM));
  const far = Math.abs(edgeScrollSpeed(TOP + 10, TOP, BOTTOM));
  expect(far).toBeGreaterThan(near);
  // Un pointeur hors zone (drag au-delà du bord) ne doit pas s'emballer.
  expect(edgeScrollSpeed(-200, TOP, BOTTOM)).toBe(edgeScrollSpeed(TOP, TOP, BOTTOM));
  expect(edgeScrollSpeed(1600, TOP, BOTTOM)).toBe(edgeScrollSpeed(BOTTOM, TOP, BOTTOM));
});

test('zone trop courte pour deux bandes : aucun défilement', () => {
  expect(edgeScrollSpeed(50, 0, 120)).toBe(0);
});

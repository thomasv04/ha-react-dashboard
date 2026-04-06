/**
 * Dynamic Lucide icon resolver.
 * Maps icon names (PascalCase strings from config) to actual React components.
 * We use the wildcard re-export so tree-shaking still works in production,
 * but the edit modal can iterate the full catalogue.
 */
import * as allIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Full map name → component (lazy-built, cached) */
let _iconMap: Record<string, LucideIcon> | null = null;

export function getIconMap(): Record<string, LucideIcon> {
  if (_iconMap) return _iconMap;
  _iconMap = {};
  for (const [name, mod] of Object.entries(allIcons)) {
    // Only keep PascalCase components (skip helpers like createLucideIcon, etc.)
    if (/^[A-Z]/.test(name) && typeof mod === 'function') {
      _iconMap[name] = mod as LucideIcon;
    }
  }
  return _iconMap;
}

/** Sorted icon name list (cached) */
let _iconNames: string[] | null = null;
export function getIconNames(): string[] {
  if (_iconNames) return _iconNames;
  _iconNames = Object.keys(getIconMap()).sort();
  return _iconNames;
}

/** Resolve an icon name to a component, or undefined */
export function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return getIconMap()[name];
}

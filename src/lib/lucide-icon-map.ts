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
    // Accept both plain function components and forwardRef objects (modern lucide-react)
    if (/^[A-Z]/.test(name) && mod != null && (typeof mod === 'function' || (typeof mod === 'object' && '$$typeof' in (mod as object)))) {
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
  // Custom uploaded icons start with "custom:" — not a Lucide icon
  if (name.startsWith('custom:')) return undefined;
  return getIconMap()[name];
}

/** Check if an icon value is a custom uploaded icon */
export function isCustomIcon(name: string | undefined): boolean {
  return !!name && name.startsWith('custom:');
}

/** Get the URL of a custom icon (strips "custom:" prefix) */
export function getCustomIconUrl(name: string): string {
  return name.replace(/^custom:/, '');
}

import { useEffect, useState, useRef, type RefObject } from 'react';

export type WidgetSizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

function classify(w: number): WidgetSizeClass {
  if (w < 120) return 'xs';
  if (w < 200) return 'sm';
  if (w < 320) return 'md';
  if (w < 480) return 'lg';
  return 'xl';
}

// Hysteresis in px to prevent oscillation when the widget sits on a boundary.
// A size class only changes when width crosses the threshold by this margin.
const HYSTERESIS = 10;

const ORDER: WidgetSizeClass[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const UPPER: Record<WidgetSizeClass, number> = { xs: 120, sm: 200, md: 320, lg: 480, xl: Infinity };
const LOWER: Record<WidgetSizeClass, number> = { xs: 0, sm: 120, md: 200, lg: 320, xl: 480 };

function classifyHysteresis(w: number, current: WidgetSizeClass): WidgetSizeClass {
  const naive = classify(w);
  if (naive === current) return current;
  const isGrowing = ORDER.indexOf(naive) > ORDER.indexOf(current);
  if (isGrowing && w < UPPER[current] + HYSTERESIS) return current;
  if (!isGrowing && w > LOWER[current] - HYSTERESIS) return current;
  return naive;
}

export function useWidgetSize(ref: RefObject<HTMLElement | null>): WidgetSizeClass {
  const [size, setSize] = useState<WidgetSizeClass>('md');
  const sizeRef = useRef<WidgetSizeClass>('md');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const next = classifyHysteresis(w, sizeRef.current);
      if (next !== sizeRef.current) {
        sizeRef.current = next;
        setSize(next);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  return size;
}

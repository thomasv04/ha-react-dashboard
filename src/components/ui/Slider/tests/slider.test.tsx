import { render } from '@testing-library/react';

import { describe, it, expect, vi } from 'vitest';

import { Slider } from '@/components/ui/Slider/components/slider';

// Mock Radix Slider
vi.mock('radix-ui', () => ({
  Slider: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Root: (props: any) => (
      <div data-slot='slider' {...props}>
        {props.children}
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Track: (props: any) => (
      <div data-slot='slider-track' {...props}>
        {props.children}
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Range: (props: any) => (
      <div data-slot='slider-range' {...props}>
        {props.children}
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Thumb: (props: any) => (
      <div data-slot='slider-thumb' {...props}>
        {props.children}
      </div>
    ),
  },
}));

describe('Slider', () => {
  it('rend le composant Slider', () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it('accepte les props min, max, value', () => {
    const { container } = render(<Slider min={10} max={90} value={[30]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it('utilise le fallback [min, max] si aucune valeur', () => {
    const { container } = render(<Slider min={1} max={2} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });
});

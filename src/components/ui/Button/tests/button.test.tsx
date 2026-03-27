import { render } from '@testing-library/react';
import { Button } from '../components/button';
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('rend le bouton avec le texte', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button')).toHaveTextContent('Click me');
  });

  it('accepte la prop variant', () => {
    const { getByRole } = render(<Button variant="outline">Outline</Button>);
    expect(getByRole('button')).toHaveTextContent('Outline');
  });

  it('accepte la prop size', () => {
    const { getByRole } = render(<Button size="lg">Large</Button>);
    expect(getByRole('button')).toHaveTextContent('Large');
  });

  it('accepte la prop asChild', () => {
    const { getByText } = render(<Button asChild><a href="#">Link</a></Button>);
    expect(getByText('Link').tagName).toBe('A');
  });
});

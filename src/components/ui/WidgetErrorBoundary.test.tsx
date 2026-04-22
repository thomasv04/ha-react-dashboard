import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

// Suppress console.error noise from React error boundaries
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function ThrowingComponent({ message }: { message: string }): ReactElement {
  throw new Error(message);
}

function GoodComponent() {
  return <p>All good</p>;
}

describe('WidgetErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <WidgetErrorBoundary>
        <GoodComponent />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    render(
      <WidgetErrorBoundary>
        <ThrowingComponent message='boom' />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('Widget indisponible')).toBeInTheDocument();
    expect(screen.queryByText('All good')).not.toBeInTheDocument();
  });

  it('displays label in fallback when provided', () => {
    render(
      <WidgetErrorBoundary label='Météo'>
        <ThrowingComponent message='crash' />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('Météo')).toBeInTheDocument();
  });
});

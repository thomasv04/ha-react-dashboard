import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetErrorBoundary, reloadIfStaleBundle } from './WidgetErrorBoundary';

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

  // Hors provider i18n, `t()` rend la clé — c'est sur elle que portent les
  // assertions, et non sur un texte français qui changerait avec la traduction.
  it('renders fallback when child throws', () => {
    render(
      <WidgetErrorBoundary>
        <ThrowingComponent message='boom' />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('common.widgetUnavailable')).toBeInTheDocument();
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

  it("distingue un panneau en défaut d'un widget en défaut", () => {
    render(
      <WidgetErrorBoundary messageKey='common.panelUnavailable'>
        <ThrowingComponent message='crash' />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('common.panelUnavailable')).toBeInTheDocument();
  });

  it('refait le rendu quand on réessaie', async () => {
    // Une exception passagère — entité absente le temps d'une reconnexion —
    // ne doit pas condamner la case jusqu'au prochain rechargement de page.
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('boom');
      return <p>All good</p>;
    }

    render(
      <WidgetErrorBoundary>
        <Flaky />
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('common.widgetUnavailable')).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /common.retry/ }));

    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});

describe('reloadIfStaleBundle', () => {
  beforeEach(() => sessionStorage.clear());

  it('recharge quand un chunk du build précédent a disparu', () => {
    expect(reloadIfStaleBundle(new Error('Failed to fetch dynamically imported module: /chunks/RoomCard-abc.js'))).toBe(true);
  });

  it('laisse passer une erreur de rendu ordinaire', () => {
    expect(reloadIfStaleBundle(new Error("Cannot read properties of undefined (reading 'state')"))).toBe(false);
  });

  it('ne recharge pas en boucle si le chunk manque vraiment', () => {
    const err = new Error('Failed to fetch dynamically imported module: /chunks/RoomCard-abc.js');
    const t0 = 1_700_000_000_000;
    expect(reloadIfStaleBundle(err, t0)).toBe(true);
    expect(reloadIfStaleBundle(err, t0 + 60_000)).toBe(false);
    // Un déploiement plus tard dans la même session mérite pourtant son rechargement.
    expect(reloadIfStaleBundle(err, t0 + 11 * 60_000)).toBe(true);
  });
});

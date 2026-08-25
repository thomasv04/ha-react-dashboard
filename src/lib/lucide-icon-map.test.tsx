import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useIconNames } from './lucide-icon-map';

function Names() {
  const names = useIconNames();
  return <span data-testid='count'>{names.length}</span>;
}

describe('useIconNames', () => {
  // Le sélecteur d'icônes lisait la liste une fois au montage, sans jamais
  // demander le catalogue : il n'affichait que les 49 icônes du noyau.
  it('remplace le noyau par le catalogue complet une fois chargé', async () => {
    render(<Names />);
    const initial = Number(screen.getByTestId('count').textContent);
    expect(initial).toBeGreaterThan(0);

    await waitFor(() => {
      expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(1000);
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { resolveIcon, useIconCatalog, useIconNames } from './lucide-icon-map';

function Names() {
  const names = useIconNames();
  return <span data-testid='count'>{names.length}</span>;
}

function Shown({ name }: { name: string }) {
  useIconCatalog();
  return <span data-testid={name}>{resolveIcon(name) ? 'ok' : 'repli'}</span>;
}

describe('resolveIcon', () => {
  it('charge une icône hors du noyau à la demande', async () => {
    render(<Shown name='Rocket' />);
    await waitFor(() => expect(screen.getByTestId('Rocket').textContent).toBe('ok'));
  });

  // L'ancien catalogue listait aussi les variantes `XIcon` et `LucideX`, et des
  // configurations les ont enregistrées. `Home` est un alias de `House`.
  it.each(['RocketIcon', 'LucideCat', 'Home', 'Fingerprint'])('résout encore %s', async name => {
    render(<Shown name={name} />);
    await waitFor(() => expect(screen.getByTestId(name).textContent).toBe('ok'));
  });

  it('laisse un nom inconnu sur son repli', async () => {
    render(<Shown name='PasUneIcone' />);
    await new Promise(r => setTimeout(r, 200));
    expect(screen.getByTestId('PasUneIcone').textContent).toBe('repli');
  });
});

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

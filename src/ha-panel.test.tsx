import { describe, it, expect, vi, beforeEach } from 'vitest';

const unmount = vi.fn();
const render = vi.fn();

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render, unmount })),
}));
// L'arbre réel tire tout le dashboard : seule la gestion du nœud nous intéresse.
vi.mock('./Dashboard', () => ({ default: () => null }));

import { createRoot } from 'react-dom/client';
import { mountDashboard } from './ha-panel';

describe('mountDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("déplace l'arbre d'un hôte à l'autre sans le démonter", () => {
    const a = document.createElement('div');
    const b = document.createElement('div');

    const handleA = mountDashboard(a);
    const node = a.firstElementChild;
    expect(node).toBeTruthy();

    // Home Assistant reconstruit sa vue : ancien élément détaché, nouveau monté.
    handleA.destroy();
    const handleB = mountDashboard(b);

    expect(b.firstElementChild).toBe(node);
    expect(createRoot).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(unmount).not.toHaveBeenCalled();

    // Une poignée périmée ne doit pas arracher l'arbre à son nouvel hôte.
    handleA.destroy();
    expect(b.firstElementChild).toBe(node);

    // Départ définitif : là, on démonte pour de bon.
    handleB.destroy();
    vi.runAllTimers();
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  // Régression : sans scroller interne, le contenu débordait de la carte et
  // faisait défiler le document de HA — dont le `body` ne fait qu'un écran de
  // haut. Passé ce premier écran, le fond du dashboard ne peignait plus.
  it('fait défiler le dashboard dans la carte, pas le document de HA', () => {
    const host = document.createElement('div');
    mountDashboard(host);
    expect((host.firstElementChild as HTMLElement).style.overflowY).toBe('auto');
  });
});

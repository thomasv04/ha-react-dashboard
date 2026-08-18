import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const openMoreInfo = vi.fn();
const callService = vi.fn();

vi.mock('@hakit/core', () => ({ useHass: () => ({ helpers: { callService } }) }));
vi.mock('@/context/MoreInfoContext', () => ({ useMoreInfo: () => ({ openMoreInfo }) }));
const entity = { state: 'open', attributes: { current_position: 15, friendly_name: 'Volet bureau' } };
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));

import { CoverRowBlockRenderer } from './CoverRowBlock';

const block = { id: 'b1', type: 'cover-row' as const, entityId: 'cover.bureau' };

beforeEach(() => vi.clearAllMocks());

describe('CoverRowBlockRenderer', () => {
  it('ouvre la fiche détaillée quand on clique la ligne', async () => {
    render(<CoverRowBlockRenderer block={block} />);

    await userEvent.click(screen.getByText('Volet bureau'));

    expect(openMoreInfo).toHaveBeenCalledWith('cover.bureau', 'cover', 'cover.bureau', expect.anything());
  });

  it("les boutons de commande n'ouvrent pas la fiche par-dessus", async () => {
    // Le reproche exact auquel `stopPropagation` répond : monter un volet
    // déclenchait aussi le clic de la ligne qui l'entoure.
    const { container } = render(<CoverRowBlockRenderer block={block} />);
    const buttons = container.querySelectorAll('button');

    for (const button of buttons) await userEvent.click(button);

    expect(callService).toHaveBeenCalledTimes(3);
    expect(openMoreInfo).not.toHaveBeenCalled();
  });

  it('reste utilisable au clavier', async () => {
    render(<CoverRowBlockRenderer block={block} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(openMoreInfo).toHaveBeenCalled();
  });
});

describe('CoverRowBlockRenderer, en carte', () => {
  it('grise la commande qui ne mènerait nulle part', () => {
    // Volet grand ouvert : « ouvrir » n'a plus rien à ouvrir. HA grise le
    // bouton plutôt que d'envoyer un service sans effet.
    entity.attributes.current_position = 100;
    const { container } = render(<CoverRowBlockRenderer block={block} card />);

    const [up, stop, down] = container.querySelectorAll('button');
    expect(up).toBeDisabled();
    expect(stop).not.toBeDisabled();
    expect(down).not.toBeDisabled();

    entity.attributes.current_position = 15;
  });
});

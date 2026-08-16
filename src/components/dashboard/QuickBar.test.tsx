import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const openMoreInfo = vi.fn();
const setCurrentPage = vi.fn();
const openPanel = vi.fn();
let isEditMode = false;

const ENTITIES = {
  'light.salon': { state: 'on', attributes: { friendly_name: 'Lampe du salon' } },
  'sensor.temperature_chambre': { state: '19.4', attributes: { friendly_name: 'Température chambre' } },
  'climate.bureau': { state: 'heat', attributes: { friendly_name: 'Chauffage bureau' } },
};

vi.mock('@hakit/core', () => ({
  useHass: (selector: (s: unknown) => unknown) => selector({ entities: ENTITIES }),
}));
vi.mock('@/context/PageContext', () => ({
  usePages: () => ({ pages: [{ id: 'home', label: 'Accueil' }], setCurrentPage }),
}));
vi.mock('@/context/PanelContext', () => ({ usePanel: () => ({ openPanel }) }));
vi.mock('@/context/CustomPanelContext', () => ({
  useCustomPanels: () => ({ panels: [{ id: 'cuisine', name: 'Cuisine' }] }),
}));
vi.mock('@/context/MoreInfoContext', () => ({ useMoreInfo: () => ({ openMoreInfo }) }));
vi.mock('@/context/DashboardLayoutContext', () => ({ useEditMode: () => ({ isEditMode }) }));

import { QuickBar } from './QuickBar';

beforeEach(() => {
  vi.clearAllMocks();
  isEditMode = false;
});

/** Ouvre la barre par la touche indiquée, comme le ferait l'utilisateur. */
async function open(key: 'e' | 'c') {
  render(<QuickBar />);
  await userEvent.keyboard(key);
}

describe('QuickBar', () => {
  it("reste invisible tant qu'on ne l'appelle pas", () => {
    render(<QuickBar />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it("« e » liste les entités et rien d'autre", async () => {
    await open('e');
    expect(screen.getByText('Lampe du salon')).toBeInTheDocument();
    expect(screen.queryByText('Accueil')).not.toBeInTheDocument();
  });

  it('« c » liste les pages et panneaux, pas les entités', async () => {
    await open('c');
    expect(screen.getByText('Accueil')).toBeInTheDocument();
    expect(screen.getByText('Cuisine')).toBeInTheDocument();
    expect(screen.queryByText('Lampe du salon')).not.toBeInTheDocument();
  });

  // Les chaînes vivent sous `dashboard.quickBar`, pas `quickBar` : demandées
  // sans leur préfixe, `t()` renvoyait la clé et l'utilisateur lisait
  // « quickBar.searchEntity » dans le champ.
  //
  // `t()` est remplacé par l'identité dans tout le banc d'essai (`test/setup`),
  // donc aucun test ne peut comparer à du français — c'est précisément ce qui a
  // laissé passer le défaut. Ce qui se vérifie ici, c'est la clé **complète**
  // que le composant réclame.
  it('demande ses chaînes sous leur chemin complet — mode entité', async () => {
    await open('e');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'dashboard.quickBar.searchEntity');
  });

  it('demande ses chaînes sous leur chemin complet — mode commande', async () => {
    await open('c');
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'dashboard.quickBar.searchCommand');
    expect(screen.getByText(/dashboard\.quickBar\.page/)).toBeInTheDocument();
  });

  it("filtre sur le nom convivial comme sur l'identifiant", async () => {
    await open('e');
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'chambre');
    expect(screen.getByText('Température chambre')).toBeInTheDocument();
    expect(screen.queryByText('Lampe du salon')).not.toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'light.');
    expect(screen.getByText('Lampe du salon')).toBeInTheDocument();
  });

  it("ouvre la fiche de l'entité choisie", async () => {
    await open('e');
    await userEvent.type(screen.getByRole('textbox'), 'salon');
    await userEvent.click(screen.getByText('Lampe du salon'));

    expect(openMoreInfo).toHaveBeenCalledWith('light.salon', 'light', 'light.salon', null);
  });

  it('choisit la modale thermostat pour un « climate »', async () => {
    // Le domaine HA et la clé du registre de modales ne portent pas le même nom.
    await open('e');
    await userEvent.type(screen.getByRole('textbox'), 'bureau');
    await userEvent.click(screen.getByText('Chauffage bureau'));

    expect(openMoreInfo).toHaveBeenCalledWith('climate.bureau', 'thermostat', 'climate.bureau', null);
  });

  it('« c » navigue vers une page', async () => {
    await open('c');
    await userEvent.click(screen.getByText('Accueil'));
    expect(setCurrentPage).toHaveBeenCalledWith('home');
  });

  it('« c » ouvre un panneau personnalisé', async () => {
    await open('c');
    await userEvent.click(screen.getByText('Cuisine'));
    expect(openPanel).toHaveBeenCalledWith('custom:cuisine');
  });

  it('valide au clavier sans toucher la souris', async () => {
    await open('e');
    await userEvent.type(screen.getByRole('textbox'), 'salon');
    await userEvent.keyboard('{Enter}');

    expect(openMoreInfo).toHaveBeenCalledWith('light.salon', 'light', 'light.salon', null);
  });

  it('se ferme sur Échap', async () => {
    await open('e');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it("ne s'ouvre pas en mode édition — on y saisit du texte", async () => {
    isEditMode = true;
    render(<QuickBar />);
    await userEvent.keyboard('e');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('ne se déclenche pas depuis un champ de saisie', async () => {
    render(
      <>
        <input aria-label='ailleurs' />
        <QuickBar />
      </>
    );
    // Taper « e » dans un champ doit écrire « e », pas ouvrir la barre.
    await userEvent.type(screen.getByLabelText('ailleurs'), 'e');
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });
});

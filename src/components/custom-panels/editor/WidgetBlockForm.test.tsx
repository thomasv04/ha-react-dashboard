import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// Le sélecteur d'entité parle à Home Assistant : hors de propos ici, on veut
// seulement savoir si le champ est demandé.
vi.mock('@/components/layout/WidgetEditModal/EntityPicker', () => ({
  EntityPicker: ({ label }: { label: string }) => <div>entity-picker:{label}</div>,
}));
// Le sélecteur de zone interroge le registre HA : hors sujet ici.
vi.mock('@/components/layout/WidgetEditModal/AreaControlsField', () => ({
  AreaControlsField: ({ label, onChange }: { label: string; onChange: (v: { area: string; controls: string[] }) => void }) => (
    <button onClick={() => onChange({ area: 'salon', controls: ['light'] })}>area-field:{label}</button>
  ),
}));

vi.mock('@/context/CustomPanelContext', () => ({ useCustomPanels: () => ({ panels: [] }) }));

import { WidgetBlockForm } from './BlockForms';
import type { WidgetBlock } from '@/types/custom-panel';

const block: WidgetBlock = { id: 'b1', type: 'widget', widgetType: 'light', config: {}, rows: 4 };

describe('WidgetBlockForm', () => {
  // Le bloc n'offrait que le type et la hauteur : la card atterrissait dans le
  // panneau sans entité, et rien ne permettait de la configurer.
  it('affiche les réglages du widget choisi', () => {
    render(<WidgetBlockForm block={block} onChange={() => {}} />);
    expect(screen.getByText(/entity-picker:/)).toBeInTheDocument();
  });

  it("ne montre aucun réglage tant qu'aucun type n'est choisi", () => {
    render(<WidgetBlockForm block={{ ...block, widgetType: '' }} onChange={() => {}} />);
    expect(screen.queryByText(/entity-picker:/)).not.toBeInTheDocument();
  });

  // Le `<select>` natif est peint par le navigateur : fond blanc et surlignage
  // système au milieu d'une modale sombre. Remplacé par une grille de vignettes.
  it('choisit la card dans une grille, pas dans un menu natif', async () => {
    const onChange = vi.fn();
    const { container } = render(<WidgetBlockForm block={{ ...block, widgetType: '' }} onChange={onChange} />);
    expect(container.querySelector('select')).toBeNull();

    await userEvent.click(screen.getByText('layout.customPanel.widgetTypeNone'));
    await userEvent.click(screen.getByText('widgets.light.label'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ widgetType: 'light' }));
  });

  it('filtre les cards à la frappe', async () => {
    render(<WidgetBlockForm block={{ ...block, widgetType: '' }} onChange={() => {}} />);
    await userEvent.click(screen.getByText('layout.customPanel.widgetTypeNone'));

    // `t()` est l'identité dans le banc d'essai : on cherche donc dans la clé.
    await userEvent.type(screen.getByPlaceholderText('layout.searchWidget'), 'light');
    expect(screen.getByText('widgets.light.label')).toBeInTheDocument();
    expect(screen.queryByText('widgets.clock.label')).not.toBeInTheDocument();
  });

  // Le champ « Zone Home Assistant » de la card Pièce est de type
  // `area-controls` : le renderer ne le connaissait pas et retombait sur une
  // zone de texte libre, où l'on ne pouvait rien saisir d'utile.
  it('rend un vrai sélecteur pour une zone Home Assistant', () => {
    render(<WidgetBlockForm block={{ ...block, widgetType: 'room' }} onChange={() => {}} />);
    expect(screen.getByText(/area-field:/)).toBeInTheDocument();
  });

  // Deux clés écrites d'un coup : avec l'ancien contrat clé/valeur, le second
  // appel repartait du même brouillon et effaçait le premier.
  it('écrit la zone et ses commandes en une seule fois', async () => {
    const onChange = vi.fn();
    render(<WidgetBlockForm block={{ ...block, widgetType: 'room' }} onChange={onChange} />);

    await userEvent.click(screen.getByText(/area-field:/));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ area: 'salon', areaControls: ['light'] }) })
    );
  });
});

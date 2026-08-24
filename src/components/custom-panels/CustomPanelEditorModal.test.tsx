import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const saveConfig = vi.fn().mockResolvedValue(undefined);
const onClose = vi.fn();
const PANEL = { id: 'p1', name: 'Volets', blocks: [] };

vi.mock('@/context/CustomPanelContext', () => ({
  useCustomPanels: () => ({ panels: [PANEL], upsertPanel: vi.fn(), deletePanel: vi.fn(), dock: { panels: [], labels: true } }),
}));
vi.mock('@/context/PageContext', () => ({ usePages: () => ({ pages: [{ id: 'home', label: 'Accueil' }] }) }));
vi.mock('@/context/DashboardLayoutContext', () => ({ useDashboardLayout: () => ({ allLayouts: {} }) }));
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ allWidgetConfigsByPage: {}, getWidgetConfig: () => ({}), updateWidgetConfig: vi.fn() }),
}));
vi.mock('@/context/WallPanelContext', () => ({
  useWallPanel: () => ({ config: {}, wallPanelLayout: {}, wallPanelWidgetConfigs: {} }),
}));
vi.mock('@/hooks/useDashboardConfig', () => ({ useDashboardConfig: () => ({ saveConfig, isSaving: false }) }));

import { CustomPanelEditorModal } from './CustomPanelEditorModal';

beforeEach(() => vi.clearAllMocks());

describe('CustomPanelEditorModal', () => {
  // L'éditeur s'ouvre aussi hors mode édition, où le bouton Sauvegarder du
  // dashboard n'existe pas : les panneaux composés là n'atteignaient jamais le
  // serveur et disparaissaient au rechargement.
  it('enregistre les panneaux côté serveur en fermant', async () => {
    render(<CustomPanelEditorModal onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('layout.customPanel.panelPlaceholder'), ' du salon');
    await userEvent.click(screen.getByText('layout.customPanel.saveAndClose'));

    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ customPanels: [{ ...PANEL, name: 'Volets du salon' }] }));
    expect(onClose).toHaveBeenCalled();
  });

  // La croix enregistrait dans le dos de l'utilisateur, y compris sur un clic à
  // côté de la fenêtre. Elle demande maintenant, comme la modale WallPanel.
  it('demande avant de jeter un brouillon modifié', async () => {
    render(<CustomPanelEditorModal onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('layout.customPanel.panelPlaceholder'), '!');
    await userEvent.click(screen.getByLabelText('common.close'));

    expect(screen.getByText('layout.customPanel.unsavedWarning')).toBeInTheDocument();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('layout.customPanel.discard'));
    expect(onClose).toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it("ferme sans rien demander quand rien n'a bougé", async () => {
    render(<CustomPanelEditorModal onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('common.close'));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('layout.customPanel.unsavedWarning')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setEditMode = vi.fn();
const saveConfig = vi.fn();

vi.mock('@hakit/core', () => ({ useUser: () => ({ is_admin: true }) }));
vi.mock('@/context/DashboardLayoutContext', () => ({
  useEditMode: () => ({ isEditMode: true, setEditMode }),
  useDashboardLayout: () => ({
    saveLayout: vi.fn(),
    allLayouts: {},
    packLayout: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    removeWidgets: vi.fn(),
  }),
}));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ allWidgetConfigsByPage: {} }) }));
vi.mock('@/context/PageContext', () => ({ usePages: () => ({ pages: [], currentPage: 'home' }) }));
vi.mock('@/context/WallPanelContext', () => ({
  useWallPanel: () => ({ config: {}, wallPanelLayout: null, wallPanelWidgetConfigs: {} }),
}));
vi.mock('@/context/CustomPanelContext', () => ({ useCustomPanels: () => ({ panels: [], dock: undefined }) }));
vi.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ behaviourSettings: {} }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useGridSelection: () => ({ selected: new Set() }) }));
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useDashboardConfig', () => ({ useDashboardConfig: () => ({ saveConfig, isSaving: false }) }));

import { EditButton } from './EditButton';

beforeEach(() => vi.clearAllMocks());

describe('EditButton — sauvegarde', () => {
  it('reste en mode édition quand le serveur refuse la sauvegarde', async () => {
    // Quitter l'édition après un refus faisait croire à une sauvegarde réussie :
    // les changements disparaissaient au rechargement.
    saveConfig.mockResolvedValue(false);
    render(<EditButton />);
    await userEvent.click(screen.getByTitle('common.save'));

    expect(saveConfig).toHaveBeenCalled();
    expect(setEditMode).not.toHaveBeenCalledWith(false);
  });

  it('quitte le mode édition une fois la sauvegarde réussie', async () => {
    saveConfig.mockResolvedValue(true);
    render(<EditButton />);
    await userEvent.click(screen.getByTitle('common.save'));

    expect(setEditMode).toHaveBeenCalledWith(false);
  });
});

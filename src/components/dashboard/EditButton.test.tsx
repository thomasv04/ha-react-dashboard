import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const editMock = vi.hoisted(() => ({ isEditMode: true }));
const setEditMode = vi.fn();
const saveConfig = vi.fn();

vi.mock('@hakit/core', () => ({ useUser: () => ({ is_admin: true }) }));
vi.mock('@/context/DashboardLayoutContext', () => ({
  useEditMode: () => ({ isEditMode: editMock.isEditMode, setEditMode, editPanelId: null, setEditPanelId: vi.fn() }),
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
import { setGuestPreview } from '@/hooks/useIsAdmin';

beforeEach(() => vi.clearAllMocks());

describe('EditButton — sauvegarde', () => {
  it('reste en mode édition quand le serveur refuse la sauvegarde', async () => {
    // Quitter l'édition après un refus faisait croire à une sauvegarde réussie :
    // les changements disparaissaient au rechargement.
    saveConfig.mockResolvedValue(false);
    render(<EditButton />);
    await userEvent.click(screen.getByTitle('dashboard.doneTooltip'));

    expect(saveConfig).toHaveBeenCalled();
    expect(setEditMode).not.toHaveBeenCalledWith(false);
  });

  it('quitte le mode édition une fois la sauvegarde réussie', async () => {
    saveConfig.mockResolvedValue(true);
    render(<EditButton />);
    await userEvent.click(screen.getByTitle('dashboard.doneTooltip'));

    expect(setEditMode).toHaveBeenCalledWith(false);
  });
});

describe('EditButton — vue invité', () => {
  beforeEach(() => {
    editMock.isEditMode = false;
  });
  afterEach(() => {
    act(() => setGuestPreview(false));
    editMock.isEditMode = true;
  });

  it('propose le crayon et l’œil à un administrateur', () => {
    render(<EditButton />);
    expect(screen.getByTitle('dashboard.editTooltipEnter')).toBeDefined();
    expect(screen.getByTestId('guest-view-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('en vue invité, le crayon disparaît et l’œil reste pour en sortir', async () => {
    render(<EditButton />);
    await userEvent.click(screen.getByTestId('guest-view-toggle'));

    expect(screen.queryByTitle('dashboard.editTooltipEnter')).toBeNull();
    expect(screen.getByTestId('guest-view-toggle').getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(screen.getByTestId('guest-view-toggle'));
    expect(screen.getByTitle('dashboard.editTooltipEnter')).toBeDefined();
  });

  it('n’offre pas la vue invité pendant l’édition', () => {
    editMock.isEditMode = true;
    render(<EditButton />);
    expect(screen.queryByTestId('guest-view-toggle')).toBeNull();
  });
});

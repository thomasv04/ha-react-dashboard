import { createRef, type MutableRefObject } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_WALLPANEL_CONFIG } from '@/types/wallpanel';

const saveConfig = vi.fn();
const updateConfig = vi.fn();
const activate = vi.fn();

vi.mock('@/context/WallPanelContext', () => ({
  useWallPanel: () => ({
    config: DEFAULT_WALLPANEL_CONFIG,
    updateConfig,
    activate,
    enterWallPanelEditMode: vi.fn(),
    wallPanelLayout: { panels: [] },
    wallPanelWidgetConfigs: {},
  }),
}));
vi.mock('@/context/PageContext', () => ({ usePages: () => ({ pages: [] }) }));
vi.mock('@/context/DashboardLayoutContext', () => ({ useDashboardLayout: () => ({ allLayouts: {} }) }));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ allWidgetConfigsByPage: {} }) }));
vi.mock('@/context/CustomPanelContext', () => ({ useCustomPanels: () => ({ panels: [], dock: undefined }) }));
vi.mock('@/hooks/useDashboardConfig', () => ({ useDashboardConfig: () => ({ saveConfig }) }));
vi.mock('@/lib/panel-grid', () => ({ layoutWidgets: () => [] }));
// L'aperçu monte le diaporama, l'horloge et une grille : hors sujet ici.
vi.mock('./WallPanelPreview', () => ({ WallPanelPreview: () => <div data-testid='preview' /> }));
vi.mock('@/components/layout/WidgetEditModal/EntityPicker', () => ({ EntityPicker: () => null }));
vi.mock('@/components/layout/WidgetEditModal/PanelSelectField', () => ({ PanelSelectField: () => null }));

import { WallPanelSettings } from './WallPanelSettings';

function setup() {
  const guard = createRef<(() => boolean) | null>() as MutableRefObject<(() => boolean) | null>;
  guard.current = null;
  const onClose = vi.fn();
  render(<WallPanelSettings onClose={onClose} guard={guard} />);
  const status = () => screen.getByTestId('wallpanel-save-status').getAttribute('data-status');
  /** Bascule l'interrupteur « activer la veille » : une modification du brouillon. */
  const edit = () => fireEvent.click(screen.getByRole('switch', { name: /layout.wallPanel.enableScreensaver/ }));
  return { guard, onClose, status, edit };
}

/** Laisse les promesses en attente se résoudre. */
const settle = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('WallPanelSettings — enregistrement automatique', () => {
  it("n'a plus de bouton « Sauvegarder »", () => {
    setup();
    expect(screen.queryByRole('button', { name: 'common.save' })).toBeNull();
  });

  it('enregistre ~800 ms après la dernière modification', async () => {
    saveConfig.mockResolvedValue(true);
    const { status, edit } = setup();

    edit();
    expect(status()).toBe('pending');
    await act(async () => void vi.advanceTimersByTime(799));
    expect(saveConfig).not.toHaveBeenCalled();

    await act(async () => void vi.advanceTimersByTime(1));
    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(saveConfig.mock.calls[0][0].wallPanel.config.enabled).toBe(!DEFAULT_WALLPANEL_CONFIG.enabled);
    expect(updateConfig).toHaveBeenCalled();
    expect(status()).toBe('saved');
  });

  it('propose de réessayer après un échec', async () => {
    saveConfig.mockResolvedValueOnce(false).mockResolvedValue(true);
    const { status, edit } = setup();

    edit();
    await act(async () => void vi.advanceTimersByTime(800));
    expect(status()).toBe('error');

    fireEvent.click(screen.getByRole('button', { name: /layout.wallPanel.autosave.retry/ }));
    await settle();
    expect(saveConfig).toHaveBeenCalledTimes(2);
    expect(status()).toBe('saved');
  });
});

describe('WallPanelSettings — garde de fermeture', () => {
  it('laisse fermer quand tout est enregistré', () => {
    const { guard } = setup();
    expect(guard.current?.()).toBe(false);
  });

  it('retient la fermeture pendant le délai, enregistre aussitôt, puis ferme', async () => {
    saveConfig.mockResolvedValue(true);
    const { guard, onClose, edit } = setup();

    edit();
    let held = false;
    act(() => void (held = guard.current!()));
    expect(held).toBe(true);
    expect(screen.getByTestId('wallpanel-close-pending')).toBeInTheDocument();

    // Pas besoin d'attendre le délai : la fermeture envoie tout de suite.
    await settle();
    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('retient la fermeture tant que la requête est en vol', async () => {
    let resolve!: (ok: boolean) => void;
    saveConfig.mockImplementation(() => new Promise<boolean>(r => (resolve = r)));
    const { guard, onClose, edit, status } = setup();

    edit();
    await act(async () => void vi.advanceTimersByTime(800));
    expect(status()).toBe('saving');

    let held = false;
    act(() => void (held = guard.current!()));
    expect(held).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => resolve(true));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("après un échec, retient la fermeture et propose de réessayer ou d'abandonner", async () => {
    saveConfig.mockResolvedValue(false);
    const { guard, onClose, edit } = setup();

    edit();
    await act(async () => void vi.advanceTimersByTime(800));

    let held = false;
    act(() => void (held = guard.current!()));
    expect(held).toBe(true);
    await settle();
    expect(onClose).not.toHaveBeenCalled();

    const pending = screen.getByTestId('wallpanel-close-pending');
    expect(pending).toHaveTextContent('layout.wallPanel.autosave.closeError');

    // Abandonner : la veille revient à la dernière configuration enregistrée, et la garde laisse passer.
    updateConfig.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'layout.wallPanel.discard' }));
    expect(updateConfig).toHaveBeenCalledWith(DEFAULT_WALLPANEL_CONFIG);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(guard.current?.()).toBe(false);
  });

  it('« Réessayer » depuis la fermeture retenue enregistre puis ferme', async () => {
    saveConfig.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValue(true);
    const { guard, onClose, edit } = setup();

    edit();
    await act(async () => void vi.advanceTimersByTime(800));
    act(() => void guard.current!());
    await settle();
    expect(onClose).not.toHaveBeenCalled();

    const retry = screen.getAllByRole('button', { name: /layout.wallPanel.autosave.retry/ });
    fireEvent.click(retry[retry.length - 1]);
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('« Voir la veille » enregistre avant de fermer et de lancer la veille', async () => {
    saveConfig.mockResolvedValue(true);
    const { onClose, edit } = setup();

    edit();
    fireEvent.click(screen.getByRole('button', { name: /layout.wallPanel.preview.show/ }));
    await settle();
    expect(saveConfig).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(300));
    expect(activate).toHaveBeenCalled();
  });

  it('« Voir la veille » reste sur les réglages si l’enregistrement échoue', async () => {
    saveConfig.mockResolvedValue(false);
    const { onClose, edit } = setup();

    edit();
    fireEvent.click(screen.getByRole('button', { name: /layout.wallPanel.preview.show/ }));
    await settle();
    act(() => void vi.advanceTimersByTime(300));
    expect(onClose).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});

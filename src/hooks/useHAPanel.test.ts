import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const openPanel = vi.fn();
const deactivate = vi.fn();
const addToast = vi.fn();

vi.mock('@hakit/core', () => ({ useHass: () => null }));
vi.mock('@/context/CustomPanelContext', () => ({ useCustomPanels: () => ({ panels: [{ id: 'b2', name: 'Sonnette', blocks: [] }] }) }));
vi.mock('@/context/PanelContext', () => ({ usePanel: () => ({ openPanel }) }));
vi.mock('@/context/WallPanelContext', () => ({ useWallPanel: () => ({ isActive: true, deactivate }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ addToast }) }));

import { useOpenPanelFromEvent } from './useHAPanel';

beforeEach(() => vi.clearAllMocks());

describe('useOpenPanelFromEvent', () => {
  // La sonnette sonne pendant la veille : la modale passerait dessous.
  it("lève l'écran de veille et ouvre la modale pour la durée demandée", () => {
    const { result } = renderHook(() => useOpenPanelFromEvent());
    result.current({ panel: 'sonnette', duration_ms: 30000, sound: false });
    expect(deactivate).toHaveBeenCalled();
    expect(openPanel).toHaveBeenCalledWith('custom:b2', 30000);
  });

  it("dit quelle modale manque au lieu de n'afficher rien", () => {
    const { result } = renderHook(() => useOpenPanelFromEvent());
    result.current({ panel: 'Portail' });
    expect(openPanel).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('panelNotFound') }));
  });
});

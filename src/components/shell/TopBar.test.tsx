import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const behaviour = vi.hoisted(() => ({ current: { showUser: true } as { showUser?: boolean } }));
const quick = vi.hoisted(() => ({ id: '' }));
const openPanel = vi.fn();

vi.mock('@hakit/core', () => ({ useUser: () => ({ name: 'Thomas' }) }));
vi.mock('@/hooks/useWeatherNow', () => ({ useWeatherNow: () => ({ temperature: undefined, Icon: () => null }) }));
vi.mock('@/hooks/useFormats', () => ({ useFormats: () => ({ formatTime: () => '12:00' }) }));
vi.mock('@/context/ThemeContext', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTheme: () => ({ behaviourSettings: behaviour.current }),
}));
vi.mock('@/context/WallPanelContext', () => ({ useWallPanel: () => ({ config: { gestures: { quickPanelId: quick.id } } }) }));
vi.mock('@/context/PanelContext', () => ({ usePanel: () => ({ openPanel }) }));

import { TopBar } from './TopBar';

const renderBar = () => render(<TopBar launcherOpen={false} onToggleLauncher={() => {}} />);

beforeEach(() => {
  openPanel.mockClear();
  quick.id = '';
  behaviour.current = { showUser: true };
});

describe('TopBar', () => {
  it('affiche la pastille de l’utilisateur par défaut', () => {
    renderBar();
    expect(screen.getByRole('img', { name: 'Thomas' })).toHaveTextContent('T');
  });

  it('la masque quand l’appareil le demande', () => {
    behaviour.current = { showUser: false };
    renderBar();
    expect(screen.queryByRole('img', { name: 'Thomas' })).toBeNull();
  });

  it('sans menu rapide choisi, pas de poignée', () => {
    renderBar();
    expect(screen.queryByRole('button', { name: 'layout.wallPanel.gestures.quickMenu' })).toBeNull();
  });

  it('la poignée ouvre le menu rapide, à l’appui comme au glissé vers le bas', () => {
    quick.id = 'custom:rapide';
    renderBar();
    const handle = screen.getByRole('button', { name: 'layout.wallPanel.gestures.quickMenu' });

    fireEvent.click(handle);
    expect(openPanel).toHaveBeenLastCalledWith('custom:rapide');

    openPanel.mockClear();
    fireEvent.pointerDown(handle, { clientY: 10 });
    fireEvent.pointerMove(window, { clientY: 50 });
    expect(openPanel).toHaveBeenCalledWith('custom:rapide');
  });
});

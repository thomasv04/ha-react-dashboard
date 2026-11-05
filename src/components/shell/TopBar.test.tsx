import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const behaviour = vi.hoisted(() => ({ current: { showUser: true } as { showUser?: boolean } }));

vi.mock('@hakit/core', () => ({ useUser: () => ({ name: 'Thomas' }) }));
vi.mock('@/hooks/useWeatherNow', () => ({ useWeatherNow: () => ({ temperature: undefined, Icon: () => null }) }));
vi.mock('@/hooks/useFormats', () => ({ useFormats: () => ({ formatTime: () => '12:00' }) }));
vi.mock('@/context/ThemeContext', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTheme: () => ({ behaviourSettings: behaviour.current }),
}));

import { TopBar } from './TopBar';

const renderBar = () => render(<TopBar launcherOpen={false} onToggleLauncher={() => {}} />);

describe('TopBar', () => {
  it('affiche la pastille de l’utilisateur par défaut', () => {
    behaviour.current = { showUser: true };
    renderBar();
    expect(screen.getByRole('img', { name: 'Thomas' })).toHaveTextContent('T');
  });

  it('la masque quand l’appareil le demande', () => {
    behaviour.current = { showUser: false };
    renderBar();
    expect(screen.queryByRole('img', { name: 'Thomas' })).toBeNull();
  });
});

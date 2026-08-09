import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'widgets.alarm.disarmed': 'Désarmé',
        'widgets.alarm.disarm': 'Désarmer',
        'widgets.alarm.arm_home': 'Armé domicile',
        'widgets.alarm.arm_away': 'Armé absent',
        'widgets.alarm.arm_night': 'Armé nuit',
        'widgets.alarm.pending': 'En attente',
        'widgets.alarm.triggered': 'Alarme déclenchée',
      };
      return map[k] ?? k;
    },
    tArray: () => [],
  }),
}));

// `motion` en Proxy : lister div/button à la main cassait dès que la card
// utilisait un autre élément animé (`motion.circle` pour l'anneau d'état).
// Ici, `motion.<n'importe quoi>` rend l'élément DOM correspondant.
vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get:
      (_t, tag: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ children, ...props }: any) =>
        React.createElement(tag, props, children),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock partiel à partir du module réel : la liste d'icônes écrite à la main
// cassait dès qu'un module du graphe en importait une de plus (le manifeste
// d'un widget, par exemple), et vitest valide les exports nommés — un Proxy ne
// suffit donc pas.
vi.mock('lucide-react', async importOriginal => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Stub = (p: any) => <span {...p} />;
  return { ...actual, ShieldCheck: Stub, ShieldAlert: Stub, ShieldOff: Stub, Delete: Stub, ChevronDown: Stub };
});

// La card lit sa config par le contexte ; le test la rend hors provider.
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

const mockCallService = vi.fn();
vi.mock('@hakit/core', () => ({
  useHass: () => ({ helpers: { callService: mockCallService } }),
}));

// `attributes` toujours présent : c'est le contrat de `useSafeEntity`, qui
// normalise à `{}`. Le bouchon doit refléter ce contrat, sinon il teste une
// forme d'entité qui n'existe pas à l'exécution.
vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => ({ state: 'disarmed', attributes: {} })),
}));

import { useSafeEntity } from '@/hooks/useSafeEntity';
import { AlarmCard } from './AlarmCard';

test('renders null when no alarm entity', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSafeEntity as any).mockImplementationOnce(() => null);
  const { container } = render(<AlarmCard />);
  expect(container.firstChild).toBeNull();
});

test('shows state label and numpad, handles code input and disarm', () => {
  render(<AlarmCard />);

  // initial label from mocked state 'disarmed'
  expect(screen.getByText('Désarmé')).toBeDefined();

  // expand the keypad: first button is the chevron
  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBeGreaterThan(0);
  fireEvent.click(buttons[0]);

  // press 1,2,3
  fireEvent.click(screen.getByText('1'));
  fireEvent.click(screen.getByText('2'));
  fireEvent.click(screen.getByText('3'));

  // masked code should show 3 bullets
  expect(screen.getByText('•••')).toBeDefined();

  // press backspace (⌫)
  // deux boutons effacent : celui du champ et la touche du pavé — le premier suffit
  fireEvent.click(screen.getAllByLabelText('widgets.alarm.backspace')[0]);
  expect(screen.getByText('••')).toBeDefined();

  // disarm
  // « Désarmer » apparaît sur la pastille de mode et sur le bouton de
  // confirmation ; c'est le dernier (la confirmation) qui déclenche l'appel.
  const disarms = screen.getAllByText('Désarmer');
  fireEvent.click(disarms[disarms.length - 1]);

  expect(mockCallService).toHaveBeenCalled();
  expect(mockCallService).toHaveBeenCalledWith(expect.objectContaining({ service: 'alarm_disarm', serviceData: { code: '12' } }));
});

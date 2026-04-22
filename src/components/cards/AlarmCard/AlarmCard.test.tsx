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

vi.mock('framer-motion', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: (props: any) => <div {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    button: (props: any) => <button {...props} />,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ShieldCheck: (p: any) => <span {...p} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ShieldAlert: (p: any) => <span {...p} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ShieldOff: (p: any) => <span {...p} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Delete: (p: any) => <span {...p} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ChevronDown: (p: any) => <span {...p} />,
}));

const mockCallService = vi.fn();
vi.mock('@hakit/core', () => ({
  useHass: () => ({ helpers: { callService: mockCallService } }),
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => ({ state: 'disarmed' })),
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
  fireEvent.click(screen.getByText('⌫'));
  expect(screen.getByText('••')).toBeDefined();

  // disarm
  fireEvent.click(screen.getByText('Désarmer'));

  expect(mockCallService).toHaveBeenCalled();
  expect(mockCallService).toHaveBeenCalledWith(expect.objectContaining({ service: 'alarm_disarm', serviceData: { code: '12' } }));
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
    button: (props: any) => <button {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  ShieldCheck: (p: any) => <span {...p} />,
  ShieldAlert: (p: any) => <span {...p} />,
  ShieldOff: (p: any) => <span {...p} />,
  Delete: (p: any) => <span {...p} />,
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


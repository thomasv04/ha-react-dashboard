import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, tArray: () => [] }),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

const callServiceMock = vi.fn();

vi.mock('@hakit/core', () => ({
  // Le bouchon doit appliquer le sélecteur : le code de production passe
  // `useHass(s => s.helpers)` pour ne pas s'abonner au store entier.
  useHass: (selector?: (s: { helpers: { callService: typeof callServiceMock } }) => unknown) => {
    const state = { helpers: { callService: callServiceMock } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: () => ({
    attributes: { temperature: 21, current_temperature: 20.5, hvac_action: 'heating', preset_mode: 'comfort' },
    state: 'heating',
  }),
}));

import { ThermostatCard } from './ThermostatCard';

test('renders thermostat and calls services on interactions', () => {
  render(<ThermostatCard />);
  // there should be buttons (power + 3 presets)
  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBeGreaterThanOrEqual(4);

  // click power (first button)
  fireEvent.click(buttons[0]);
  expect(callServiceMock).toHaveBeenCalled();
});

// La case de la grille ouvre la fiche sur appui long et sur clic : un réglage
// sur l'anneau ne doit lui transmettre ni l'un ni l'autre.
test("un réglage sur l'anneau ne remonte pas jusqu'à la case", () => {
  callServiceMock.mockClear();
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 270, height: 270 } as DOMRect);
  Element.prototype.setPointerCapture = vi.fn();
  const parentDown = vi.fn();
  const parentClick = vi.fn();
  const { container } = render(
    <div onPointerDown={parentDown} onClick={parentClick}>
      <ThermostatCard />
    </div>
  );
  const svg = container.querySelector('svg[viewBox="0 0 270 270"]')!;

  // Bord droit de l'anneau (90°) → 26,67 °C, arrondi au pas de 0,5.
  fireEvent.pointerDown(svg, { clientX: 252, clientY: 135, button: 0, pointerId: 1 });
  fireEvent.pointerUp(svg, { clientX: 252, clientY: 135, pointerId: 1 });
  fireEvent.click(svg, { clientX: 252, clientY: 135 });
  expect(parentDown).not.toHaveBeenCalled();
  expect(parentClick).not.toHaveBeenCalled();
  expect(callServiceMock).toHaveBeenCalledWith(expect.objectContaining({ serviceData: { temperature: 26.5 } }));

  // Le centre n'est pas une poignée : l'appui reste à la case.
  callServiceMock.mockClear();
  fireEvent.pointerDown(svg, { clientX: 135, clientY: 135, button: 0, pointerId: 2 });
  fireEvent.pointerUp(svg, { clientX: 135, clientY: 135, pointerId: 2 });
  fireEvent.click(svg, { clientX: 135, clientY: 135 });
  expect(parentDown).toHaveBeenCalled();
  expect(parentClick).toHaveBeenCalled();
  expect(callServiceMock).not.toHaveBeenCalled();
});

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, tArray: () => [], language: 'fr' }),
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
    entity_id: 'climate.salon',
    attributes: { temperature: 21, current_temperature: 20.5, hvac_modes: ['off', 'heat', 'cool'] },
    state: 'heat',
  }),
}));

import { ThermostatCard } from './ThermostatCard';

beforeEach(() => callServiceMock.mockClear());

test('les flèches ajustent la consigne et les modes changent le mode', () => {
  render(<ThermostatCard />);
  fireEvent.click(screen.getByRole('button', { name: 'widgets.thermostat.increase' }));
  expect(callServiceMock).toHaveBeenCalledWith(expect.objectContaining({ service: 'set_temperature', serviceData: { temperature: 21.5 } }));

  // Chauffage actif, entre ses voisins : Clim au-dessous.
  expect(screen.getByRole('radio', { name: 'widgets.thermostat.modes.heat' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('radio', { name: 'widgets.thermostat.modes.cool' }));
  expect(callServiceMock).toHaveBeenCalledWith(expect.objectContaining({ service: 'set_hvac_mode', serviceData: { hvac_mode: 'cool' } }));
});

// La case de la grille ouvre la fiche sur appui long et sur clic : un réglage
// sur l'anneau ne doit lui transmettre ni l'un ni l'autre.
test("un réglage sur l'anneau ne remonte pas jusqu'à la case", () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
  Element.prototype.setPointerCapture = vi.fn();
  const parentDown = vi.fn();
  const parentClick = vi.fn();
  const { container } = render(
    <div onPointerDown={parentDown} onClick={parentClick}>
      <ThermostatCard />
    </div>
  );
  const dial = container.querySelector('svg[viewBox="0 0 200 200"]')!.parentElement!;

  // Bord droit de l'anneau (3 h) : 210/240 de la course de 10 à 30 °C → 27,5.
  fireEvent.pointerDown(dial, { clientX: 188, clientY: 100, button: 0, pointerId: 1 });
  fireEvent.pointerUp(dial, { clientX: 188, clientY: 100, pointerId: 1 });
  fireEvent.click(dial, { clientX: 188, clientY: 100 });
  expect(parentDown).not.toHaveBeenCalled();
  expect(parentClick).not.toHaveBeenCalled();
  expect(callServiceMock).toHaveBeenCalledWith(expect.objectContaining({ serviceData: { temperature: 27.5 } }));

  // Le centre n'est pas une poignée : l'appui reste à la case.
  callServiceMock.mockClear();
  fireEvent.pointerDown(dial, { clientX: 100, clientY: 100, button: 0, pointerId: 2 });
  fireEvent.pointerUp(dial, { clientX: 100, clientY: 100, pointerId: 2 });
  fireEvent.click(dial, { clientX: 100, clientY: 100 });
  expect(parentDown).toHaveBeenCalled();
  expect(parentClick).toHaveBeenCalled();
  expect(callServiceMock).not.toHaveBeenCalled();
});

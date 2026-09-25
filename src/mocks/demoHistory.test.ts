import { describe, expect, it } from 'vitest';
import { stateAt } from '@/lib/floorplan';
import { demoHistory } from './demoHistory';

describe('demoHistory', () => {
  // Une journée d'hier, de minuit à minuit, en heure locale.
  const start = new Date(2026, 5, 20, 0, 0).getTime();
  const at = (hour: number) => start + hour * 3_600_000;
  const history = demoHistory(
    ['sensor.din_panneaux_solaire_puissance', 'sensor.solarflow_2400_ac_grid_input_power'],
    start,
    start + 86_400_000
  );

  it('makes the panels produce under the sun, and nothing at night', () => {
    const solar = history['sensor.din_panneaux_solaire_puissance'];
    expect(Number(stateAt(solar, at(13.5))?.state)).toBeGreaterThan(1500);
    expect(stateAt(solar, at(2))?.state).toBe('0');
  });

  it('draws from the grid what the panels do not cover', () => {
    const grid = history['sensor.solarflow_2400_ac_grid_input_power'];
    expect(stateAt(grid, at(13.5))?.state).toBe('0');
    expect(Number(stateAt(grid, at(20))?.state)).toBeGreaterThan(500);
  });
});

import { describe, it, expect } from 'vitest';
import { railStatus } from './rail-status';

const e = (state: string, attributes: Record<string, unknown> = {}) => ({ state, attributes });

describe('railStatus', () => {
  it('lit un thermostat à sa température, allumé hors de « off »', () => {
    expect(railStatus('climate.salon', e('heat', { current_temperature: 20.6 }))).toEqual({ text: '21°', on: true });
    expect(railStatus('climate.salon', e('off', { current_temperature: 18 }))).toEqual({ text: '18°', on: false });
  });

  it('lit un capteur à sa valeur, l’unité réduite à ° ou %', () => {
    expect(railStatus('sensor.temp', e('19.4', { unit_of_measurement: '°C' }))).toEqual({ text: '19°', on: false });
    expect(railStatus('sensor.hum', e('54', { unit_of_measurement: '%' }))).toEqual({ text: '54%', on: false });
    expect(railStatus('sensor.power', e('320', { unit_of_measurement: 'W' }))).toEqual({ text: '320', on: false });
  });

  it('allume l’icône d’un appareil actif, pas d’un appareil éteint ou absent', () => {
    expect(railStatus('light.salon', e('on'))).toEqual({ on: true });
    expect(railStatus('lock.porte', e('unlocked'))).toEqual({ on: true });
    expect(railStatus('lock.porte', e('locked'))).toEqual({ on: false });
    expect(railStatus('sensor.x', e('unavailable'))).toEqual({ on: false });
    expect(railStatus('light.salon', null)).toEqual({ on: false });
  });
});

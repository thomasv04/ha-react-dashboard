import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    tArray: () => [],
  }),
}));

const entities = {
  'sensor.telecommande_batterie': { state: '8', attributes: { device_class: 'battery', friendly_name: 'Télécommande' } },
  'sensor.capteur_porte_batterie': { state: '73', attributes: { device_class: 'battery', friendly_name: 'Capteur porte' } },
  'sensor.thermometre_batterie': { state: '35', attributes: { device_class: 'battery', friendly_name: 'Thermomètre' } },
  // Batterie binaire : pas de niveau chiffré, donc rien à afficher
  'binary_sensor.detecteur_batterie': { state: 'on', attributes: { device_class: 'battery', friendly_name: 'Détecteur' } },
  // Bruit : ne doit pas remonter dans la liste
  'sensor.salon_temperature': { state: '21.5', attributes: { device_class: 'temperature', friendly_name: 'Salon' } },
};

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = { entities, helpers: { callService: vi.fn() } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

const config: Record<string, unknown> = { type: 'batteries', threshold: 20 };

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ getWidgetConfig: () => config }),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'batteries',
}));

import { BatteriesCard } from './BatteriesCard';

describe('BatteriesCard', () => {
  it('ne garde que les batteries chiffrées, la plus faible en tête', () => {
    render(<BatteriesCard />);

    const names = screen.getAllByText(/Télécommande|Capteur porte|Thermomètre|Détecteur|Salon/).map(n => n.textContent);
    expect(names).toEqual(['Télécommande', 'Thermomètre', 'Capteur porte']);
  });

  it('compte les batteries sous le seuil', () => {
    render(<BatteriesCard />);
    // Seule la télécommande (8 %) est sous les 20 % configurés
    expect(screen.getByText('widgets.batteries.lowCount:1,20')).toBeDefined();
  });

  it('masque les batteries saines en mode « seulement les faibles »', () => {
    config.onlyLow = true;
    render(<BatteriesCard />);
    expect(screen.getByText('Télécommande')).toBeDefined();
    expect(screen.queryByText('Capteur porte')).toBeNull();
    config.onlyLow = false;
  });

  it('ignore les entités exclues', () => {
    config.exclude = ['sensor.telecommande_batterie'];
    render(<BatteriesCard />);
    expect(screen.queryByText('Télécommande')).toBeNull();
    // Le compteur suit : plus aucune batterie sous le seuil
    expect(screen.getByText('widgets.batteries.lowCount:0,20')).toBeDefined();
    config.exclude = [];
  });
});

import { describe, it, expect } from 'vitest';
import { buildStarterLayout, hasControls, type StarterArea } from './starter-layout';

const ents = (...ids: string[]) => ids.map(entity_id => ({ entity_id }));

const SALON: StarterArea = {
  area_id: 'salon',
  name: 'Salon',
  entities: ents('light.a', 'light.b', 'light.c', 'light.d', 'light.e', 'cover.volet', 'climate.salon', 'sensor.temp', 'media_player.tv'),
};
const GARAGE: StarterArea = { area_id: 'garage', name: 'Garage', entities: ents('sensor.porte') };

describe('buildStarterLayout', () => {
  it("pose l'accueil, une tuile par pièce, puis un panneau d'appareils par pièce équipée", () => {
    const { layout, widgetConfigs } = buildStarterLayout([SALON, GARAGE], { weatherId: 'weather.home', roomsTitle: 'Pièces' });

    expect(layout.panels.map(p => [p.id, p.title, p.widgets.map(w => w.type)])).toEqual([
      ['panel-home', undefined, ['welcome', 'weather']],
      ['panel-rooms', 'Pièces', ['room', 'room']],
      // Garage : aucun appareil à tuile, pas de panneau. Salon : 4 lumières au plus.
      ['panel-salon', 'Salon', ['thermostat', 'light', 'light', 'light', 'light', 'cover', 'media_player']],
    ]);

    const room = layout.panels[1].widgets[0];
    expect(widgetConfigs[room.id]).toEqual({
      type: 'room',
      label: 'Salon',
      icon: 'Home',
      area: 'salon',
      areaControls: ['light', 'cover', 'climate', 'media_player'],
    });
    const light = layout.panels[2].widgets[1];
    expect(widgetConfigs[light.id]).toEqual({ type: 'light', entityId: 'light.a' });
  });

  it('chaque tuile a sa configuration, sous un identifiant unique, et tient dans son panneau', () => {
    const { layout, widgetConfigs } = buildStarterLayout([SALON], { roomsTitle: 'Pièces' });
    const widgets = layout.panels.flatMap(p => p.widgets.map(w => ({ ...w, cols: p.cols })));
    expect(new Set(widgets.map(w => w.id)).size).toBe(widgets.length);
    for (const w of widgets) {
      expect(widgetConfigs[w.id]?.type).toBe(w.type);
      expect(w.w).toBeLessThanOrEqual(w.cols);
    }
  });

  it('sans pièce ni météo, il reste le panneau d’accueil', () => {
    expect(buildStarterLayout([], { roomsTitle: 'Pièces' }).layout.panels.map(p => p.widgets.map(w => w.type))).toEqual([['welcome']]);
  });
});

describe('hasControls', () => {
  it('ne retient que les pièces avec un appareil pilotable', () => {
    expect(hasControls(SALON)).toBe(true);
    expect(hasControls(GARAGE)).toBe(false);
  });
});

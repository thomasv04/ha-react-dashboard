import { describe, expect, it } from 'vitest';
import { buildRoomLayout } from './room-layout';

describe('buildRoomLayout', () => {
  it('range les appareils dans l’ordre de la maquette et ignore le reste', () => {
    const { layout, widgetConfigs } = buildRoomLayout({
      area_id: 'salon',
      entities: [
        { entity_id: 'light.plafonnier' },
        { entity_id: 'sensor.temperature' },
        { entity_id: 'climate.salon' },
        { entity_id: 'media_player.salon' },
        { entity_id: 'camera.a' },
        { entity_id: 'camera.b' },
      ],
    });
    const widgets = layout.panels[0].widgets;
    expect(widgets.map(w => w.type)).toEqual(['media_player', 'thermostat', 'light', 'camera']);
    expect(widgets.map(w => w.w)).toEqual([4, 4, 2, 4]);
    expect(widgetConfigs.camera).toMatchObject({ cameras: [{ entityId: 'camera.a' }, { entityId: 'camera.b' }] });
    expect(widgetConfigs[widgets[2].id]).toMatchObject({ type: 'light', entityId: 'light.plafonnier' });
  });

  it('une pièce sans appareil n’a pas de panneau', () => {
    expect(buildRoomLayout({ area_id: 'vide', entities: [{ entity_id: 'sensor.x' }] }).layout.panels).toEqual([]);
  });
});

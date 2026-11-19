import { describe, expect, it } from 'vitest';
import { availableCameras, frigateOf, shownCameras } from './phone-cameras';

const frigate = (name: string) => ({ state: 'idle', attributes: { camera_name: name, client_id: 'frigate' } });
const ENTITIES = {
  'camera.salon_frigate': frigate('salon_frigate'),
  'camera.allee': { state: 'idle', attributes: { camera_name: 'allee_cam', client_id: 'maison' } },
  'camera.birdseye': { state: 'streaming', attributes: {} },
  'camera.salon_fluide': { state: 'idle', attributes: {} },
  'camera.hors_ligne': { state: 'unavailable', attributes: { camera_name: 'x' } },
  'light.salon': { state: 'on' },
};

describe('caméras du téléphone', () => {
  it('ignore les caméras indisponibles et le reste', () => {
    expect(availableCameras(ENTITIES)).toEqual(['camera.allee', 'camera.birdseye', 'camera.salon_fluide', 'camera.salon_frigate']);
  });

  it('lit le nom et l’instance Frigate, même quand l’entité a été renommée', () => {
    expect(frigateOf(ENTITIES['camera.allee'])).toEqual({ camera: 'allee_cam', instance: 'maison' });
    expect(frigateOf(ENTITIES['camera.birdseye'])).toBeUndefined();
  });

  it('par défaut, les caméras Frigate seulement ; sans Frigate, toutes', () => {
    expect(shownCameras(ENTITIES, [])).toEqual(['camera.allee', 'camera.salon_frigate']);
    expect(shownCameras({ 'camera.a': { state: 'idle' }, 'camera.b': { state: 'idle' } }, [])).toEqual(['camera.a', 'camera.b']);
  });

  it('le choix des Paramètres l’emporte, dans son ordre, sans les caméras disparues', () => {
    expect(shownCameras(ENTITIES, ['camera.salon_fluide', 'camera.disparue', 'camera.allee'])).toEqual([
      'camera.salon_fluide',
      'camera.allee',
    ]);
  });
});

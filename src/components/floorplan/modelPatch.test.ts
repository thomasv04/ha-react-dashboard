import { ShaderChunk } from 'three';
import { describe, expect, it } from 'vitest';
import { POINT_LIGHT_INFO } from './modelPatch';

describe('modelPatch', () => {
  // Sans elle, rien ne tient plus une lampe à sa pièce : sa lumière traverse
  // de nouveau les murs, sans erreur ni avertissement.
  it('trouve dans three.js la ligne qui calcule la lumière de chaque lampe', () => {
    expect(ShaderChunk.lights_fragment_begin).toContain(POINT_LIGHT_INFO);
  });
});

import { ShaderChunk, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { POINT_LIGHT_INFO } from './modelPatch';

describe('modelPatch', () => {
  // Sans elle, rien ne tient plus une lampe à sa pièce : sa lumière traverse
  // de nouveau les murs, sans erreur ni avertissement.
  it('trouve dans three.js la ligne qui calcule la lumière de chaque lampe', () => {
    expect(ShaderChunk.lights_fragment_begin).toContain(POINT_LIGHT_INFO);
  });

  // Sans eux, plus de coupe ni de fondu — les murs resteraient debout, sans
  // erreur non plus : les matériaux d'une maquette glTF, et ceux des ombres.
  it('trouve dans three.js où greffer la coupe des murs et son fondu', () => {
    for (const shader of [ShaderLib.standard, ShaderLib.physical, ShaderLib.basic, ShaderLib.depth]) {
      expect(shader.vertexShader).toContain('#include <project_vertex>');
      expect(shader.fragmentShader).toContain('#include <common>');
      expect(shader.fragmentShader).toContain('#include <clipping_planes_fragment>');
    }
    expect(ShaderLib.standard.fragmentShader).toContain('#include <dithering_fragment>');
  });
});

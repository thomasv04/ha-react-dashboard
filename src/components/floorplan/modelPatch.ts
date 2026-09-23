import {
  BackSide,
  DoubleSide,
  FrontSide,
  MeshDepthMaterial,
  RGBADepthPacking,
  Vector3,
  Vector4,
  type Material,
  type Mesh,
  type Object3D,
  type WebGLProgramParametersWithUniforms,
} from 'three';

/**
 * Retouches des matériaux de la maquette, faites dans ses shaders
 * (`onBeforeCompile`) :
 *
 * - les **murs en coupe**, façon Les Sims : au-dessus d'une hauteur, seuls
 *   restent debout les murs du fond — les côtés de l'emprise tournés dos à la
 *   caméra. La tranche d'un mur coupé est pleine et sombre : ce sont ses faces
 *   intérieures, qu'on voit par la coupe, peintes d'une teinte unie ;
 * - des **découpes** : boîtes où la maquette n'est pas dessinée. Une porte
 *   fondue dans son mur — un export n'a souvent qu'un objet par matière — ne
 *   peut pas pivoter : on la découpe, et un battant généré prend sa place.
 *
 * Les ombres suivent ce qu'on voit : ce qui n'est pas dessiné n'en porte pas.
 */

/** Au-delà, les découpes suivantes sont ignorées : la boucle du shader a une borne fixe. */
export const MAX_CUTS = 24;

/** Tranche des murs coupés, en sRGB : un gris bleuté sombre, comme dans Les Sims. */
const CAP_COLOR = new Vector3(0.16, 0.18, 0.23);

export interface Cut {
  /** Centre, dans la scène. */
  center: [number, number, number];
  /** Direction horizontale de la largeur, unitaire : (x, z). */
  u: [number, number];
  /** Demi-largeur, demi-hauteur, demi-épaisseur. */
  half: [number, number, number];
}

/** Partagés par tous les matériaux de la maquette : une mise à jour vaut pour tous. */
export function createModelUniforms() {
  return {
    fpCutCount: { value: 0 },
    fpCuts: { value: Array.from({ length: MAX_CUTS * 2 }, () => new Vector4()) },
    /**
     * x : hauteur des murs abaissés ; y : haut de la maquette — un mur debout
     * y monte ; z : épaisseur gardée le long des murs du fond ; w : profondeur
     * de la tranche peinte sous la coupe, pour un matériau à double face.
     */
    fpCutaway: { value: new Vector4() },
    /** Emprise de la maquette : x−, z−, x+, z+. */
    fpBox: { value: new Vector4() },
    /** Hauteur de chaque côté de l'emprise (x−, z−, x+, z+) — un mur du fond debout, ou abaissé. */
    fpSides: { value: new Vector4() },
    fpCapColor: { value: CAP_COLOR },
  };
}

export type ModelUniforms = ReturnType<typeof createModelUniforms>;

export function setCuts(uniforms: ModelUniforms, cuts: Cut[]) {
  const kept = cuts.slice(0, MAX_CUTS);
  kept.forEach(({ center, u, half }, i) => {
    uniforms.fpCuts.value[2 * i].set(center[0], center[1], center[2], half[2]);
    uniforms.fpCuts.value[2 * i + 1].set(u[0], u[1], half[0], half[1]);
  });
  uniforms.fpCutCount.value = kept.length;
}

export function materialsOf(object: Object3D): Material[] {
  const material = (object as Mesh).material;
  return Array.isArray(material) ? material : material ? [material] : [];
}

const VERTEX = /* glsl */ `
vec4 fpWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  fpWorld = instanceMatrix * fpWorld;
#endif
vFpWorld = ( modelMatrix * fpWorld ).xyz;`;

const DECLARATIONS = /* glsl */ `
varying vec3 vFpWorld;
uniform int fpCutCount;
uniform vec4 fpCuts[ ${MAX_CUTS * 2} ];
uniform vec4 fpCutaway;
uniform vec4 fpBox;
uniform vec4 fpSides;
uniform vec3 fpCapColor;`;

// Découpes : repère de chacune, x le long de sa largeur (u), z le long de sa
// normale (−u.z, u.x). Puis la coupe des murs, et sa tranche.
const DISCARD = /* glsl */ `
#ifdef FP_BOXES
for ( int i = 0; i < ${MAX_CUTS}; i ++ ) {
  if ( i >= fpCutCount ) break;
  vec4 c = fpCuts[ 2 * i ];
  vec4 k = fpCuts[ 2 * i + 1 ];
  vec3 d = vFpWorld - c.xyz;
  if ( abs( d.x * k.x + d.z * k.y ) < k.z && abs( d.y ) < k.w && abs( d.z * k.x - d.x * k.y ) < c.w ) discard;
}
#endif
bool fpCap = false;
// Hauteur de la maquette en ce point : celle des murs abaissés, ou celle d'un
// mur du fond — qui glisse quand la caméra tourne.
float fpLimit = fpCutaway.x;
if ( vFpWorld.x < fpBox.x + fpCutaway.z ) fpLimit = max( fpLimit, fpSides.x );
if ( vFpWorld.z < fpBox.y + fpCutaway.z ) fpLimit = max( fpLimit, fpSides.y );
if ( vFpWorld.x > fpBox.z - fpCutaway.z ) fpLimit = max( fpLimit, fpSides.z );
if ( vFpWorld.z > fpBox.w - fpCutaway.z ) fpLimit = max( fpLimit, fpSides.w );
if ( vFpWorld.y > fpLimit ) discard;
#ifdef FP_CAPS
if ( ! gl_FrontFacing ) {
  bool fpCutHere = fpLimit < fpCutaway.y;
  #ifdef FP_FRONT
  // Matériau à face unique : ses faces arrière ne sont dessinées que pour
  // faire la tranche des murs coupés.
  if ( ! fpCutHere ) discard;
  fpCap = true;
  #else
  // À double face, ses faces arrière sont les siennes : seule une bande
  // sous la coupe fait la tranche.
  fpCap = fpCutHere && vFpWorld.y > fpLimit - fpCutaway.w;
  #endif
}
#endif`;

const CAP = /* glsl */ `
#ifdef FP_CAPS
if ( fpCap ) gl_FragColor = vec4( fpCapColor, 1.0 );
#endif`;

/**
 * Variante de retouche d'un matériau : tranche peinte (opaque), face unique à
 * l'origine, découpes appliquées — pas à un élément généré, qui occupe
 * justement la découpe.
 */
type Variant = { caps: boolean; front: boolean; boxes: boolean };

function inject(shader: WebGLProgramParametersWithUniforms, uniforms: ModelUniforms, { caps, front, boxes }: Variant) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFpWorld;')
    .replace('#include <project_vertex>', `#include <project_vertex>${VERTEX}`);
  const defines = [caps && 'FP_CAPS', front && 'FP_FRONT', boxes && 'FP_BOXES'].map(d => (d ? `#define ${d}\n` : '')).join('');
  shader.fragmentShader = `${defines}${shader.fragmentShader}`
    .replace('#include <common>', `#include <common>${DECLARATIONS}`)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${DISCARD}`)
    .replace('#include <dithering_fragment>', `#include <dithering_fragment>${CAP}`);
}

/**
 * Branche les retouches sur la maquette — ou sur un élément généré, sans les
 * découpes (`boxes`) — et sur ses ombres. Renvoie le matériau d'ombre, à
 * libérer avec elle.
 *
 * Pas de tranche peinte sur une vitre : on verrait une plaque sombre au
 * travers. Un matériau à face unique ne dessine ses faces arrière que pendant
 * la coupe (`setCutawaySides`).
 */
export function patchModel(root: Object3D, uniforms: ModelUniforms, boxes = true): Material {
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  depth.onBeforeCompile = shader => inject(shader, uniforms, { caps: false, front: false, boxes });
  depth.customProgramCacheKey = () => `fp-depth${+boxes}`;

  root.traverse(o => {
    if ((o as Mesh).isMesh) (o as Mesh).customDepthMaterial = depth;
    for (const material of materialsOf(o)) {
      const variant = { caps: !material.transparent, front: material.side === FrontSide && !material.transparent, boxes };
      material.userData.fpFront = variant.front;
      material.onBeforeCompile = shader => inject(shader, uniforms, variant);
      // Une clé par variante : le texte de la fonction étant le même partout,
      // three.js confondrait sinon leurs programmes.
      material.customProgramCacheKey = () => `fp-${+variant.caps}${+variant.front}${+boxes}`;
      material.needsUpdate = true;
    }
  });
  return depth;
}

/**
 * Pendant la coupe, un matériau à face unique dessine aussi ses faces arrière
 * — le shader n'en garde que la tranche des murs coupés.
 */
export function setCutawaySides(root: Object3D, on: boolean) {
  root.traverse(o => {
    for (const material of materialsOf(o)) {
      const side = on ? DoubleSide : FrontSide;
      if (!material.userData.fpFront || material.side === side) continue;
      material.side = side;
      // Ombres inchangées : three.js dessine celles d'un matériau à face
      // unique par sa face arrière.
      material.shadowSide = on ? BackSide : null;
      material.needsUpdate = true;
    }
  });
}

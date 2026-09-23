import {
  CanvasTexture,
  CurvePath,
  LineCurve3,
  Mesh,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type Object3D,
} from 'three';
import { CABLE_COLORS, MODEL_SIZE, type FloorplanCable } from '@/lib/floorplan';

/** Rayon d'un câble, en unités de scène : un gros câble, lisible de loin — la maison fait 20 de diagonale. */
const RADIUS = MODEL_SIZE * 0.0025;
/** Rayon des coudes, en unités de scène : un câble ne fait pas d'angle vif. */
const ELBOW = MODEL_SIZE * 0.012;
/** Longueur d'une période des traits lumineux, en unités de scène. */
const FLOW_PERIOD = MODEL_SIZE * 0.04;
/** La gaine : un graphite satiné — sur un fond sombre, la lumière qui y court se voit ; sur du blanc, elle se perdait. */
const SHEATH = '#2f343b';

let dashes: HTMLCanvasElement | null = null;

/** Un trait lumineux par période, fondu à ses bouts : de la lumière qui court dans le câble. */
function dashImage() {
  if (!dashes) {
    dashes = Object.assign(document.createElement('canvas'), { width: 64, height: 1 });
    const context = dashes.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 64, 0);
      gradient.addColorStop(0, '#000');
      gradient.addColorStop(0.2, '#000');
      gradient.addColorStop(0.4, '#fff');
      gradient.addColorStop(0.55, '#fff');
      gradient.addColorStop(0.75, '#000');
      gradient.addColorStop(1, '#000');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 1);
    }
  }
  return dashes;
}

export interface CableObject {
  mesh: Mesh;
  material: MeshStandardMaterial;
  /** Les traits lumineux : son décalage les fait avancer le long du câble. */
  dashes: CanvasTexture;
  dispose(): void;
}

/**
 * Un câble posé sur la maquette : un tube qui suit ses points, coudes
 * arrondis, relevé de son rayon pour reposer sur le sol. Éclairé comme le
 * reste, il porte son ombre et passe derrière les murs ; l'énergie y circule
 * en traits lumineux, de la couleur de sa sorte.
 */
export function buildCable(cable: FloorplanCable, root: Object3D): CableObject | null {
  const lift = new Vector3(0, RADIUS, 0);
  const points = cable.points.map(p => root.localToWorld(new Vector3(...p)).add(lift));
  const path = new CurvePath<Vector3>();
  let from = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const [corner, next] = [points[i], points[i + 1]];
    const r = Math.min(ELBOW, corner.distanceTo(from) / 2, next.distanceTo(corner) / 2);
    if (r <= 0) continue;
    const before = corner.clone().addScaledVector(from.clone().sub(corner).normalize(), r);
    const after = corner.clone().addScaledVector(next.clone().sub(corner).normalize(), r);
    path.add(new LineCurve3(from, before));
    path.add(new QuadraticBezierCurve3(before, corner, after));
    from = after;
  }
  path.add(new LineCurve3(from, points[points.length - 1]));
  const length = path.getLength();
  if (!length) return null;

  const geometry = new TubeGeometry(path, Math.max(8, Math.ceil(length * 12)), RADIUS, 8, false);
  const texture = new CanvasTexture(dashImage());
  texture.wrapS = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(length / FLOW_PERIOD, 1);
  const material = new MeshStandardMaterial({
    color: SHEATH,
    roughness: 0.45,
    emissive: CABLE_COLORS[cable.kind],
    emissiveMap: texture,
    emissiveIntensity: 0,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return {
    mesh,
    material,
    dashes: texture,
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

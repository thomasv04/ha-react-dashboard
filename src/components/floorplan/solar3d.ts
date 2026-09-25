import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { solarFrame, type FloorplanSolar } from '@/lib/floorplan';

/**
 * Un champ de panneaux solaires, généré sur la maquette : autant de panneaux
 * qu'il en tient entre ses deux coins, sombres, qui s'illuminent de bleu avec
 * la production — pour une maquette qui n'a pas les siens.
 */

/** Un panneau, en mètres : 1 de large, 1,7 le long de la pente, comme on les pose. */
const PANEL = { along: 1, up: 1.7 };
/** Jour entre deux panneaux, en part de leur taille. */
const GAP = 0.06;
/** Épaisseur d'un panneau, et hauteur au-dessus de sa surface, en mètres. */
const THICKNESS = 0.04;
const LIFT = 0.03;

export interface SolarObject {
  object: Group;
  /** Partagé par ses panneaux : son éclat suit la production. */
  material: MeshStandardMaterial;
}

/**
 * Le champ dans la scène. `meter` : un mètre, en unités de la maquette — les
 * panneaux gardent leur vraie taille, quelle que soit celle de la maison.
 */
export function buildSolar(field: FloorplanSolar, root: Object3D, meter: number): SolarObject | null {
  const frame = solarFrame(field.a, field.b, field.normal);
  if (!frame) return null;
  const cols = Math.max(1, Math.floor(frame.width / (PANEL.along * meter)));
  const rows = Math.max(1, Math.floor(frame.height / (PANEL.up * meter)));
  const cell = [frame.width / cols, frame.height / rows];
  const material = new MeshStandardMaterial({
    color: '#16213a',
    metalness: 0.4,
    roughness: 0.3,
    emissive: '#5b9dff',
    emissiveIntensity: 0,
  });
  // Un panneau : x le long des rangées, y la normale, z la pente.
  const geometry = new BoxGeometry(cell[0] * (1 - GAP), THICKNESS * meter, cell[1] * (1 - GAP));
  const [along, normal, up] = [new Vector3(...frame.along), new Vector3(...frame.normal), new Vector3(...frame.up)];
  const basis = new Matrix4().makeBasis(along, normal, up);
  const origin = new Vector3(...frame.origin).addScaledVector(normal, (LIFT + THICKNESS / 2) * meter);
  // Construit dans les coordonnées de la maquette, puis posé comme elle dans la scène.
  const group = new Group();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const panel = new Mesh(geometry, material);
      panel.quaternion.setFromRotationMatrix(basis);
      panel.position
        .copy(origin)
        .addScaledVector(along, (i + 0.5) * cell[0])
        .addScaledVector(up, (j + 0.5) * cell[1]);
      panel.castShadow = panel.receiveShadow = true;
      group.add(panel);
    }
  }
  root.updateMatrixWorld(true);
  group.applyMatrix4(root.matrixWorld);
  return { object: group, material };
}

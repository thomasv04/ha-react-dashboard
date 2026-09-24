import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { partFrame, type FloorplanPart } from '@/lib/floorplan';
import { clamp } from '@/lib/utils';
import type { Cut } from './modelPatch';

/**
 * Portes, fenêtres et volets animés : générés d'après le rectangle dessiné,
 * posés dans la scène, et mus par `apply(ouverture)`.
 */

/** Ouverture d'une porte ou d'une fenêtre, en radians : un peu moins d'un angle droit. */
const SWING = Math.PI * 0.46;

/** Couleurs par défaut, quand la maquette n'en a pas donné. */
const DEFAULT_COLORS = { door: '#b58a5a', window: '#f2f2f2', shutter: '#d9d9d9', garage: '#e6e6e6' };

export interface PartObject {
  object: Group;
  /** Partie de la maquette à ne plus dessiner — l'original que l'élément remplace. */
  cut: Cut | null;
  /** 0 fermé → 1 ouvert. */
  apply(openness: number): void;
}

/** Lames d'un tablier : des niveaux de gris, que teinte la couleur du volet. */
let slatCanvas: HTMLCanvasElement | null = null;
function slatTexture() {
  if (!slatCanvas) {
    slatCanvas = document.createElement('canvas');
    slatCanvas.width = 4;
    slatCanvas.height = 32;
    const ctx = slatCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 32);
    ctx.fillStyle = '#cfcfcf';
    ctx.fillRect(0, 20, 4, 9);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 29, 4, 3);
  }
  const texture = new CanvasTexture(slatCanvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function buildPart(part: FloorplanPart, root: Object3D): PartObject | null {
  const a = root.localToWorld(new Vector3(...part.a));
  const b = root.localToWorld(new Vector3(...part.b));
  const frame = partFrame(a.toArray(), b.toArray());
  if (!frame) return null;
  const { width: w, height: h, bottom, u, angle } = frame;
  const thickness = clamp(w * 0.04, 0.03, 0.12);
  const color = part.color ?? DEFAULT_COLORS[part.kind];

  // Repère de l'élément : origine au premier coin, au sol ; x le long de
  // l'ouverture, z vers le côté choisi quand `side` vaut 1.
  const object = new Group();
  object.position.set(a.x, bottom, a.z);
  object.rotation.y = angle;

  const box = (width: number, height: number, depth: number, material: Material, x: number, y: number, z = 0) => {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };

  // L'original, dans l'épaisseur du mur, que l'élément remplace.
  const cut: Cut = {
    center: [a.x + (u[0] * w) / 2, bottom + h / 2, a.z + (u[2] * w) / 2],
    u: [u[0], u[2]],
    // Un peu en retrait des bords : ni le sol ni les montants ne disparaissent.
    half: [(w / 2) * 0.97, (h / 2) * 0.99, Math.max(thickness * 2, w * 0.12)],
  };

  let apply: (openness: number) => void;
  if (part.kind === 'door' || part.kind === 'window') {
    // Le battant pivote autour de gonds verticaux, au premier coin.
    const leaf = new Group();
    object.add(leaf);
    if (part.kind === 'door') {
      leaf.add(box(w, h, thickness, new MeshStandardMaterial({ color, roughness: 0.7 }), w / 2, h / 2));
      // Une poignée de chaque côté, à hauteur de main, du côté opposé aux gonds.
      const handle = new MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.6, roughness: 0.35 });
      for (const z of [-1, 1]) leaf.add(box(w * 0.1, h * 0.02, thickness, handle, w * 0.88, h * 0.47, z * thickness));
    } else {
      const frameMaterial = new MeshStandardMaterial({ color, roughness: 0.5 });
      const bar = Math.min(w, h) * 0.06;
      leaf.add(
        box(w, bar, thickness, frameMaterial, w / 2, bar / 2),
        box(w, bar, thickness, frameMaterial, w / 2, h - bar / 2),
        box(bar, h - 2 * bar, thickness, frameMaterial, bar / 2, h / 2),
        box(bar, h - 2 * bar, thickness, frameMaterial, w - bar / 2, h / 2),
        box(
          w - 2 * bar,
          h - 2 * bar,
          thickness * 0.3,
          new MeshStandardMaterial({ color: '#a9cde0', transparent: true, opacity: 0.35, roughness: 0.05 }),
          w / 2,
          h / 2
        )
      );
    }
    apply = openness => {
      leaf.rotation.y = -part.side * openness * SWING;
    };
  } else {
    // Volet : devant le mur, du côté choisi, sous son coffre. Porte de garage :
    // dans l'ouverture même, qu'elle libère en remontant.
    const garage = part.kind === 'garage';
    const offset = garage ? 0 : part.side * (thickness * 1.5 + w * 0.02);
    const pitch = h / (garage ? 7 : 20);
    const texture = slatTexture();
    const apron = box(w, 1, thickness * 0.5, new MeshStandardMaterial({ color, map: texture, roughness: 0.8 }), w / 2, h, offset);
    object.add(apron);
    if (!garage)
      object.add(box(w * 1.04, h * 0.1, thickness * 2, new MeshStandardMaterial({ color, roughness: 0.8 }), w / 2, h * 1.05, offset));
    apply = openness => {
      // Enroulé par le haut : la lame finale remonte, les lames gardent leur taille.
      const visible = h * (1 - openness);
      apron.visible = visible > 1e-3;
      apron.scale.y = Math.max(visible, 1e-3);
      apron.position.y = h - visible / 2;
      texture.repeat.set(1, visible / pitch);
    };
  }

  return { object, cut: part.kind === 'shutter' ? null : cut, apply };
}

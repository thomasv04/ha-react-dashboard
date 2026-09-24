import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  Sphere,
  Spherical,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  backSides,
  compassHeading,
  CUTAWAY_HEIGHT,
  cutLimit,
  flowDuration,
  isCutAway,
  MODEL_SIZE,
  partFrame,
  shortestTurn,
  sunLighting,
  type Cutaway,
  type FloorplanCable,
  type FloorplanPart,
  type FloorplanRoom,
  type Sides,
  type Vec3,
} from '@/lib/floorplan';
import {
  createModelUniforms,
  depthMaterial,
  materialsOf,
  patchModel,
  setCuts,
  setCutawaySides,
  setRoomMasks,
  type ModelUniforms,
} from './modelPatch';
import { buildCable, type CableObject } from './cables3d';
import { buildPart, type PartObject } from './parts3d';

/**
 * La maquette 3D d'une page plan : un `.glb`/`.gltf` exporté de Sweet Home 3D,
 * Blender ou Sketchfab, qu'on fait tourner, éclairé par le soleil (`sun.sun`)
 * et par les lampes posées dessus.
 *
 * Rien de React ici hors du canevas : les pastilles restent les composants du
 * plan, posés par-dessus aux coordonnées que `project` leur donne. Elles
 * gardent ainsi tout ce qu'elles savent faire, sans passer par un moteur de
 * rendu React pour three.js.
 *
 * Chargé à la demande : three.js ne pèse rien pour qui n'a pas de maquette.
 */

export interface FloorplanView3D {
  position: Vec3;
  target: Vec3;
}

/** Une lampe posée sur la maquette. `color` nulle : éteinte. */
export interface Lamp {
  id: string;
  anchor: Vec3;
  color: [number, number, number] | null;
  /** 0 à 1 */
  brightness: number;
  /** Portée, en unités de maquette */
  range: number;
  /** Contour (x, z) de sa pièce, dans les coordonnées de la maquette : elle n'éclaire qu'elle. */
  room?: [number, number][];
  /** Sa pastille est cachée par la maquette : sa lueur aussi. */
  hidden?: boolean;
}

/** Tracé au sol de la maquette : une pièce, ou celle qu'on dessine. */
export interface FloorOverlay {
  id: string;
  /** Hauteur du sol, et contour (x, z), dans les coordonnées de la maquette. */
  y: number;
  points: [number, number][];
  color: string;
  /** Opacité du remplissage ; 0 : le contour seul. */
  fill: number;
  /** Fermé : une pièce. Ouvert : un tracé en cours. */
  closed: boolean;
}

/** Porte, fenêtre ou volet, et son ouverture de l'instant (0 à 1). */
export type PartProp = FloorplanPart & { open: number };

/** Câble d'énergie, et ce qui y circule : le sens (0 : rien), la puissance si elle est connue. */
export type CableProp = FloorplanCable & { direction: -1 | 0 | 1; watts: number | null };

export interface Floorplan3DHandle {
  /** Point de la maquette → position à l'écran, en % du canevas ; `null` s'il est derrière la caméra. */
  project(anchor: Vec3): { x: number; y: number } | null;
  /** Point de la maquette sous ce point de l'écran, ou `null` s'il n'y a que du vide. */
  pick(clientX: number, clientY: number): Vec3 | null;
  /** Point (x, z) du sol à la hauteur `y` sous ce point de l'écran, comme si meubles et murs étaient transparents. */
  floorAt(clientX: number, clientY: number, y: number): [number, number] | null;
  /** Vue courante — `null` tant que rien n'est affiché. */
  view(): FloorplanView3D | null;
  resetView(): void;
  /** Redessine — après un changement qui ne vient pas de la caméra. */
  invalidate(): void;
  /** Couleur de la maquette en ce point, vu de la caméra : de quoi habiller un élément généré. */
  colorAt(point: Vec3): string | null;
  /** Côté du rectangle (a, b) tourné vers la caméra — celui qu'on voit en le dessinant. */
  facing(a: Vec3, b: Vec3): 1 | -1;
}

interface Floorplan3DProps {
  ref?: Ref<Floorplan3DHandle>;
  model: string;
  camera?: FloorplanView3D;
  sunElevation?: number;
  sunAzimuth?: number;
  north: number;
  /** Couverture nuageuse, de 0 à 1 : soleil voilé, ombres adoucies. */
  cloudiness: number;
  shadows: boolean;
  /** Murs en coupe, façon Les Sims : seuls les murs du fond restent debout. */
  cutaway: boolean;
  /** Tourner lentement après une minute sans geste. */
  idleRotate: boolean;
  /** Une lueur autour de chaque lampe allumée, de sa couleur. */
  lampGlow: boolean;
  /** Boussole : la maison tourne avec le téléphone — ce qui est en haut de l'écran est devant soi. */
  compass?: boolean;
  lamps: Lamp[];
  parts: PartProp[];
  /** Après chaque image : la caméra a pu bouger, les pastilles se recalent. */
  onFrame: () => void;
  /** Clic — pas un glisser, qui fait tourner — sur la maquette, ou à côté (`null`). */
  onPick?: (anchor: Vec3 | null, clientX: number, clientY: number) => void;
  /** Point de la maquette sous le pointeur, quand il bouge — pour dessiner. */
  onHover?: (anchor: Vec3 | null) => void;
  /** La maison tournée à la main. */
  onOrbit?: () => void;
  /** Rectangle en cours de dessin : deux coins opposés, dans les coordonnées de la maquette. */
  outline?: [Vec3, Vec3] | null;
  /** Tracés au sol : pièces, pièce en cours de dessin. */
  floors?: FloorOverlay[];
  /** Câbles d'énergie posés sur la maquette. */
  cables?: CableProp[];
  /** L'énergie peut circuler en mouvement : ni mouvement réduit, ni animations coupées. */
  flowing?: boolean;
  /** Pièce vers laquelle la caméra vole ; `null` : retour à la vue d'où elle est partie. */
  focus?: Pick<FloorplanRoom, 'y' | 'points'> | null;
  /** Points d'accroche à vérifier, par identifiant : la maquette les cache-t-elle ? */
  anchors?: Record<string, Vec3>;
  /** Scène posée, vérification faite : les points d'accroche que la maquette cache. */
  onOcclusion?: (hidden: Set<string>) => void;
  onLoad: () => void;
  onError: (kind: 'webgl' | 'model') => void;
}

/** Direction de la vue d'accueil : en surplomb, depuis un angle — la lecture d'un plan, avec le relief. */
const DEFAULT_DIRECTION = new Vector3(11, 17, 15).normalize();
/** Champ de vision vertical, en degrés : assez fermé pour que la maquette ne se déforme pas sur les bords. */
const FOV = 35;
/** Hauteur d'une lampe au-dessus de son point d'accroche (≈ 1 m pour une maison de 13 m de diagonale). */
const LAMP_LIFT = 1.5;
/** Intensité d'une lampe à pleine luminosité (candela, éclairage physique de three.js). */
const LAMP_POWER = 30;
/** Diamètre de la lueur d'une lampe, en unités de scène : assez pour déborder de sa pastille, qui la recouvre. */
const GLOW_SIZE = MODEL_SIZE * 0.16;
/** En deçà (px), un appui relâché est un clic ; au-delà, c'était une rotation. */
const CLICK_TOLERANCE = 5;
/**
 * Inclinaison maximale de la caméra. Sans coupe, toujours en surplomb : plus
 * bas, on ne voit plus que des murs, et les pastilles — jamais masquées —
 * flottent devant eux. Avec la coupe, les murs du premier plan s'abaissent :
 * la caméra peut descendre.
 */
const MAX_POLAR = { plain: Math.PI * 0.35, cutaway: Math.PI * 0.45 };
/** Sans geste pendant ce temps, la maison se met à tourner (option de la page). */
const IDLE_MS = 60_000;
/** Murs en coupe : épaisseur gardée le long des murs du fond — le mur, l'appui de ses fenêtres. */
const BACK_WALL_MARGIN = MODEL_SIZE * 0.025;
/** Lumière du ciel, au-delà de l'éclairage réaliste : un intérieur vu d'en haut resterait sinon dans la pénombre. */
const AMBIENT_BOOST = 1.5;
/** Tranche peinte sous la coupe d'un matériau à double face : de quoi remplir l'épaisseur d'un mur vue d'en haut. */
const CAP_DEPTH = MODEL_SIZE * 0.02;
/** Une porte qui s'ouvre, un volet qui descend : durée du mouvement, en ms. */
const SWING_MS = 900;
/** Un mur qui monte ou descend glisse : constante de temps, en ms (posé aux trois quarts en 150 ms). */
const WALL_SLIDE_MS = 110;
/** Vol de la caméra vers une pièce, ou retour : durée, en ms. */
const FLY_MS = 1000;
/** Une pièce n'est jamais vue plus à plat que la maison depuis la vue d'accueil : on y plonge. */
const FOCUS_MAX_POLAR = Math.acos(DEFAULT_DIRECTION.y);

/** Sans nouvelle image depuis ce temps (ms), la scène est posée : on vérifie ce que la maquette cache. */
const SETTLE_MS = 250;
/**
 * Lancers de rayon de la vérification, par image : pas plus de ce temps (ms).
 * Un rayon traverse toute la maquette — plusieurs ms sur une tablette, pour
 * chaque pastille : tous d'un coup, l'écran se figerait.
 */
const OCCLUSION_BUDGET_MS = 4;
/** Un obstacle plus près que ça d'un point d'accroche n'en est pas un : c'est la surface où il est posé. */
const OCCLUSION_MARGIN = MODEL_SIZE * 0.01;

/** Boussole : le cap est suivi en douceur — constante de temps, en ms. */
const COMPASS_SMOOTH_MS = 250;
/** Boussole : en deçà (radians, ≈ 1°), le cap ne bouge pas — le capteur tremble, la maison reste immobile. */
const COMPASS_DEADBAND = 0.0175;

/** Départ et arrivée en douceur. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Murs en coupe, à l'instant : les hauteurs glissent vers celles que demande la caméra. */
interface CutState extends Cutaway {
  /** Haut de la maquette — un mur debout y monte, sans rien y couper. */
  top: number;
  /** Hauteur des murs abaissés. */
  low: number;
  /** Côtés du fond, d'après la caméra. */
  back: Sides<boolean>;
  sliding: boolean;
}

interface CableEntry {
  obj: CableObject;
  /** Forme et sorte du câble : reconstruit quand elles changent, pas quand le courant varie. */
  key: string;
  direction: -1 | 0 | 1;
  watts: number | null;
}

interface PartEntry {
  obj: PartObject;
  /** Forme de l'élément : reconstruit quand elle change, pas quand il s'ouvre. */
  key: string;
  /** Ouverture de l'instant, et celle vers laquelle il va. */
  value: number;
  target: number;
}

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  sun: DirectionalLight;
  hemi: HemisphereLight;
  root: Object3D | null;
  /** Matériaux des ombres, retouchés comme ce qui les porte : la maquette, les éléments générés. */
  depth: { model: Material; generated: Material };
  lamps: Map<string, PointLight>;
  lampGlow: boolean;
  /** Tache douce de la lueur des lampes, partagée par toutes — créée au premier besoin. */
  glowMap: CanvasTexture | null;
  parts: Map<string, PartEntry>;
  cables: Map<string, CableEntry>;
  /** L'énergie peut circuler en mouvement, et circule. */
  flowAllowed: boolean;
  flowRunning: boolean;
  /** Rectangle en cours de dessin, créé au premier besoin. */
  outline: Group | null;
  /** Tracés au sol. */
  floors: Group;
  /** Retouches des matériaux de la maquette (coupe, découpes), partagées par tous. */
  uniforms: ModelUniforms;
  cutaway: boolean;
  /** Géométrie de la coupe — `null` tant qu'aucune maquette n'est chargée. */
  cut: CutState | null;
  /** Vue d'avant le vol vers une pièce : le retour y ramène. */
  home: FloorplanView3D | null;
  /** Numéro du vol en cours : un vol plus récent, un geste ou un recentrage l'interrompt. */
  flight: number;
  /**
   * Redessine. Ce qui a changé : tout (par défaut) ; la vue seule — les ombres
   * ne dépendent pas de la caméra ; les ombres seules — le soleil, une porte
   * qui tourne : rien ne bouge à l'écran, rien ne se cache ; ou l'image seule
   * — lampes, tracés, courant dans les câbles.
   */
  render: (what?: 'all' | 'view' | 'shadows' | 'draw') => void;
  /** Une image par frame tant que `step` rend `true` — le temps d'une animation. */
  animate: (step: (now: number) => boolean) => void;
}

const raycaster = new Raycaster();
const pointer = new Vector2();

/** Point de la scène retiré par la coupe des murs — invisible, donc ni cliquable ni support de pastille. */
function isCut(s: Stage, point: Vector3) {
  return !!s.cut && isCutAway(point.toArray() as Vec3, s.cut);
}

/** Dans la découpe d'un élément animé : l'original qu'il remplace, que la maquette ne dessine plus (cf. `modelPatch`). */
function inPartCut(s: Stage, p: Vector3) {
  return [...s.parts.values()].some(({ obj: { cut: c } }) => {
    if (!c) return false;
    const dx = p.x - c.center[0];
    const dz = p.z - c.center[2];
    return (
      Math.abs(dx * c.u[0] + dz * c.u[1]) < c.half[0] &&
      Math.abs(p.y - c.center[1]) < c.half[1] &&
      Math.abs(dz * c.u[0] - dx * c.u[1]) < c.half[2]
    );
  });
}

/** Point d'accroche, dans la scène. En haut d'un mur coupé : posé sur ce qu'il en reste, plutôt que de flotter dans le vide. */
function anchorPoint(s: Stage, root: Object3D, local: Vec3) {
  const point = root.localToWorld(new Vector3(...local));
  if (s.cut && isCut(s, point)) point.y = cutLimit(point.toArray() as Vec3, s.cut);
  return point;
}

/** Point d'accroche caché par ce que la maquette dessine — ni les murs abaissés, ni les originaux découpés. */
function occluded(s: Stage, root: Object3D, local: Vec3) {
  const toward = anchorPoint(s, root, local).sub(s.camera.position);
  raycaster.set(s.camera.position, toward.clone().normalize());
  raycaster.far = toward.length() - OCCLUSION_MARGIN;
  const hidden = raycaster.intersectObject(root, true).some(h => !isCut(s, h.point) && !inPartCut(s, h.point));
  raycaster.far = Infinity;
  return hidden;
}

/** Le rayon de la caméra vers ce point de l'écran. */
function aim(s: Stage, clientX: number, clientY: number) {
  const rect = s.renderer.domElement.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, s.camera);
}

function pick(s: Stage, clientX: number, clientY: number): Vec3 | null {
  if (!s.root) return null;
  aim(s, clientX, clientY);
  // Le lancer de rayon ignore la coupe, faite dans les shaders : sans ce tri,
  // un clic tomberait sur un mur qu'on ne voit plus.
  const hit = raycaster.intersectObject(s.root, true).find(h => !isCut(s, h.point));
  // Coordonnées de la maquette elle-même, pas de la scène : elles survivent à
  // un changement de taille ou de centrage au prochain chargement.
  return hit ? (s.root.worldToLocal(hit.point.clone()).toArray() as Vec3) : null;
}

function floorAt(s: Stage, clientX: number, clientY: number, y: number): [number, number] | null {
  if (!s.root) return null;
  aim(s, clientX, clientY);
  // Le rayon dans les coordonnées de la maquette, jusqu'au plan de ce sol.
  const from = s.root.worldToLocal(raycaster.ray.origin.clone());
  const to = s.root.worldToLocal(raycaster.ray.at(1, new Vector3()));
  const t = (y - from.y) / (to.y - from.y);
  return t > 0 && Number.isFinite(t) ? [from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t] : null;
}

/**
 * Distance à laquelle une sphère de ce rayon tient dans le cadre : dans le plus
 * étroit des deux angles de vue — le vertical sur un écran large,
 * l'horizontal sur une tablette en portrait.
 */
function fitDistance(s: Stage, radius: number) {
  const vertical = (FOV * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * s.camera.aspect);
  return radius / Math.sin(Math.min(vertical, horizontal) / 2);
}

/** Vue d'accueil par défaut : la maquette entière dans le cadre. */
function defaultView(s: Stage): FloorplanView3D {
  const box = s.root ? new Box3().setFromObject(s.root) : null;
  const radius = box ? box.getBoundingSphere(new Sphere()).radius : MODEL_SIZE / 2;
  const target = box ? box.getCenter(new Vector3()).setY(0) : new Vector3();
  // 0,85 : la sphère déborde largement d'une maison, plus plate que haute.
  const distance = fitDistance(s, radius * 0.85);
  return {
    position: target.clone().addScaledVector(DEFAULT_DIRECTION, distance).toArray() as Vec3,
    target: target.toArray() as Vec3,
  };
}

function currentView(s: Stage): FloorplanView3D {
  return { position: s.camera.position.toArray() as Vec3, target: s.controls.target.toArray() as Vec3 };
}

/** Vue rapprochée d'une pièce : cadrée sur elle, sous le même angle — en plongée, pour voir dedans. */
function roomView(s: Stage, root: Object3D, room: Pick<FloorplanRoom, 'y' | 'points'>): FloorplanView3D {
  const box = new Box3().setFromPoints(room.points.map(([x, z]) => root.localToWorld(new Vector3(x, room.y, z))));
  const target = box.getCenter(new Vector3());
  const angle = new Spherical().setFromVector3(s.camera.position.clone().sub(s.controls.target));
  angle.phi = Math.min(angle.phi, FOCUS_MAX_POLAR);
  angle.radius = fitDistance(s, box.getBoundingSphere(new Sphere()).radius);
  return {
    position: target.clone().add(new Vector3().setFromSpherical(angle)).toArray() as Vec3,
    target: target.toArray() as Vec3,
  };
}

/**
 * La caméra vole vers une vue : la cible glisse, et la caméra tourne autour
 * d'elle en s'approchant — sans couper au travers de la maison.
 */
function fly(s: Stage, to: FloorplanView3D) {
  const flight = ++s.flight;
  const target = { from: s.controls.target.clone(), to: new Vector3(...to.target) };
  const from = new Spherical().setFromVector3(s.camera.position.clone().sub(target.from));
  const goal = new Spherical().setFromVector3(new Vector3(...to.position).sub(target.to));
  const turn = shortestTurn(from.theta, goal.theta);
  const at = new Spherical();
  let start = 0;
  s.animate(now => {
    if (s.flight !== flight) return false;
    start ||= now;
    const t = Math.min(1, (now - start) / FLY_MS);
    const k = easeInOut(t);
    s.controls.target.lerpVectors(target.from, target.to, k);
    at.set(from.radius + (goal.radius - from.radius) * k, from.phi + (goal.phi - from.phi) * k, from.theta + turn * k);
    s.camera.position.setFromSpherical(at).add(s.controls.target);
    s.controls.update();
    return t < 1;
  });
}

function applyView(s: Stage, view: FloorplanView3D | undefined) {
  const { position, target } = view ?? defaultView(s);
  s.camera.position.set(...position);
  s.controls.target.set(...target);
  s.controls.update(); // émet `change`, donc un rendu
}

/** Une tache blanche, douce ; chaque lueur la teinte de sa lampe. */
function glowMap(s: Stage) {
  if (!s.glowMap) {
    const canvas = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      // Le cœur est sous la pastille : c'est l'anneau autour qui se voit.
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.35, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.18)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    s.glowMap = new CanvasTexture(canvas);
    s.glowMap.colorSpace = SRGBColorSpace;
  }
  return s.glowMap;
}

function placeLamps(s: Stage, lamps: Lamp[]) {
  const seen = new Set<string>();
  for (const lamp of lamps) {
    seen.add(lamp.id);
    let light = s.lamps.get(lamp.id);
    if (!light) {
      // Créée une fois, éteinte ensuite par son intensité : ajouter ou retirer
      // une lumière fait recompiler tous les matériaux de la scène.
      light = new PointLight(0xffffff, 0, 0, 2);
      // Sa lueur, là où est posée sa pastille : elle déborde tout autour.
      // Additive, elle éclaire ce qu'elle recouvre et se voit surtout la nuit,
      // comme une vraie ; hors du rendu tonal, qui l'éteindrait. Sans test de
      // profondeur : posée sur une surface, elle y serait coupée en deux.
      const glow = new Sprite(
        new SpriteMaterial({ map: glowMap(s), blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false })
      );
      glow.position.y = -LAMP_LIFT;
      glow.scale.setScalar(GLOW_SIZE);
      light.add(glow);
      s.scene.add(light);
      s.lamps.set(lamp.id, light);
    }
    if (lamp.color) light.color.setRGB(lamp.color[0] / 255, lamp.color[1] / 255, lamp.color[2] / 255, SRGBColorSpace);
    light.intensity = lamp.color ? LAMP_POWER * Math.max(0.15, lamp.brightness) : 0;
    const glow = light.children[0] as Sprite;
    glow.visible = s.lampGlow && !!lamp.color && !lamp.hidden;
    glow.material.color.copy(light.color);
    glow.material.opacity = 0.4 + 0.6 * lamp.brightness;
    const at = new Vector3(...lamp.anchor);
    if (s.root) s.root.localToWorld(at);
    light.position.set(at.x, at.y + LAMP_LIFT, at.z);
    // Tenue à sa pièce, une lampe peut l'éclairer jusqu'au coin le plus loin :
    // sa lumière ne passera pas les murs.
    const corners = (s.root && lamp.room?.map(([x, z]) => s.root!.localToWorld(new Vector3(x, 0, z)))) ?? [];
    light.distance = Math.max(lamp.range, ...corners.map(c => Math.hypot(c.x - at.x, c.z - at.z) * 1.2));
  }
  for (const [id, light] of s.lamps) {
    if (seen.has(id)) continue;
    s.scene.remove(light);
    (light.children[0] as Sprite).material.dispose();
    light.dispose();
    s.lamps.delete(id);
  }
  // Chaque lampe tenue à sa pièce, dans l'ordre où la scène les donne au
  // shader : celui de leur ajout, que garde aussi `s.lamps`.
  const root = s.root;
  setRoomMasks(
    s.uniforms,
    [...s.lamps.keys()].map(id => {
      const room = lamps.find(l => l.id === id)?.room;
      if (!room || !root) return null;
      return room.map(([x, z]) => {
        const p = root.localToWorld(new Vector3(x, 0, z));
        return [p.x, p.z] as [number, number];
      });
    })
  );
}

function cutawaySides(s: Stage, on: boolean) {
  if (s.root) setCutawaySides(s.root, on);
  for (const { obj } of [...s.parts.values(), ...s.cables.values()]) setCutawaySides(obj.object, on);
}

/** Murs en coupe (cf. `modelPatch`) : activés ou non, et la caméra qui peut descendre avec. */
function applyCutaway(s: Stage) {
  // Activée : les faces arrière tout de suite, pour la tranche. Désactivée :
  // une fois les murs remontés (`slideWalls`).
  if (s.cutaway) cutawaySides(s, true);
  s.controls.maxPolarAngle = s.cutaway ? MAX_POLAR.cutaway : MAX_POLAR.plain;
  s.controls.update();
}

/** Hauteurs vers lesquelles glissent les murs : celles de la coupe, ou tout debout. */
function wallTargets(s: Stage, c: CutState) {
  return {
    height: s.cutaway ? c.low : c.top,
    sides: c.back.map(back => (s.cutaway && !back ? c.low : c.top)) as Sides<number>,
  };
}

/** Un mur ne paraît ni ne disparaît d'un coup : il monte ou descend, en glissant vers sa hauteur. */
function slideWalls(s: Stage, c: CutState) {
  if (c.sliding) return;
  c.sliding = true;
  let last = 0;
  s.animate(now => {
    const k = 1 - Math.exp(-(last ? now - last : 16) / WALL_SLIDE_MS);
    last = now;
    const target = wallTargets(s, c);
    let moving = false;
    const toward = (value: number, goal: number) => {
      const next = value + (goal - value) * k;
      if (Math.abs(goal - next) < 1e-3) return goal;
      moving = true;
      return next;
    };
    c.height = toward(c.height, target.height);
    c.sides = c.sides.map((value, i) => toward(value, target.sides[i])) as Sides<number>;
    s.uniforms.fpCutaway.value.x = c.height;
    s.uniforms.fpSides.value.set(...c.sides);
    s.render();
    if (!moving) {
      c.sliding = false;
      if (!s.cutaway) cutawaySides(s, false);
    }
    return moving;
  });
}

/** Les murs du fond changent quand la caméra tourne : ils glissent vers leur nouvelle hauteur. */
function updateCutaway(s: Stage) {
  const c = s.cut;
  if (!c) return;
  c.back = backSides(s.camera.position.toArray() as Vec3, s.controls.target.toArray() as Vec3, c.back);
  const target = wallTargets(s, c);
  if (target.height !== c.height || target.sides.some((goal, i) => goal !== c.sides[i])) slideWalls(s, c);
}

/** Éléments animés : construits à leur forme, puis mus vers leur ouverture. */
function placeParts(s: Stage, parts: PartProp[]) {
  if (!s.root) return;
  const seen = new Set<string>();
  let reshaped = false;
  for (const { open, ...part } of parts) {
    seen.add(part.id);
    const key = JSON.stringify(part);
    let entry = s.parts.get(part.id);
    if (entry && entry.key !== key) {
      removeGenerated(s, s.parts, part.id);
      entry = undefined;
    }
    if (!entry) {
      const obj = buildPart(part, s.root);
      if (!obj) continue;
      // Coupé par les murets comme la maquette, mais pas par les découpes :
      // il occupe justement celle de l'original.
      patchModel(obj.object, s.uniforms, s.depth.generated, false);
      if (s.cutaway) setCutawaySides(obj.object, true);
      obj.apply(open);
      s.scene.add(obj.object);
      entry = { obj, key, value: open, target: open };
      s.parts.set(part.id, entry);
      reshaped = true;
    }
    if (entry.target !== open) {
      entry.target = open;
      s.animate(swing(s, entry));
    }
  }
  for (const id of s.parts.keys()) {
    if (seen.has(id)) continue;
    removeGenerated(s, s.parts, id);
    reshaped = true;
  }
  // Un élément posé ou retiré découpe autrement la maquette ; un élément qui
  // s'ouvre, `swing` le dessine.
  if (!reshaped) return;
  setCuts(
    s.uniforms,
    [...s.parts.values()].flatMap(entry => (entry.obj.cut ? [entry.obj.cut] : []))
  );
  s.render();
}

/** Intensité des traits lumineux dans un câble où passe le courant. */
const FLOW_GLOW = 3;

/** Câbles d'énergie : construits à leur forme, allumés selon ce qui y circule. */
function placeCables(s: Stage, cables: CableProp[]) {
  if (!s.root) return;
  const seen = new Set<string>();
  let reshaped = false;
  for (const { direction, watts, ...cable } of cables) {
    seen.add(cable.id);
    const key = JSON.stringify([cable.points, cable.kind]);
    let entry = s.cables.get(cable.id);
    if (entry && entry.key !== key) {
      removeGenerated(s, s.cables, cable.id);
      entry = undefined;
    }
    if (!entry) {
      const obj = buildCable(cable, s.root);
      if (!obj) continue;
      // Coupé par les murets comme la maquette, s'il monte le long d'un mur.
      patchModel(obj.object, s.uniforms, s.depth.generated, false);
      if (s.cutaway) setCutawaySides(obj.object, true);
      s.scene.add(obj.object);
      entry = { obj, key, direction, watts };
      s.cables.set(cable.id, entry);
      reshaped = true;
    }
    entry.direction = direction;
    entry.watts = watts;
    // Au repos, la gaine seule ; quand le courant passe, la lumière court dedans.
    entry.obj.material.emissiveIntensity = direction ? FLOW_GLOW : 0;
  }
  for (const id of s.cables.keys()) {
    if (seen.has(id)) continue;
    removeGenerated(s, s.cables, id);
    reshaped = true;
  }
  // Un câble posé ou retiré change les ombres ; un courant qui varie, non. Hors
  // de la maquette, il ne cache aucune pastille.
  s.render(reshaped ? 'shadows' : 'draw');
  runFlows(s);
}

/** Retire un élément généré — porte, volet, câble — de la scène, et le libère. */
function removeGenerated(s: Stage, entries: Map<string, { obj: { object: Object3D } }>, id: string) {
  const entry = entries.get(id);
  if (!entry) return;
  s.scene.remove(entry.obj.object);
  disposeTree(entry.obj.object);
  entries.delete(id);
}

/**
 * L'énergie circule : les traits lumineux avancent dans chaque câble où passe
 * le courant, d'autant plus vite qu'il est fort. Trente images par seconde,
 * sans recalculer les ombres — la seule animation continue de la page.
 */
function runFlows(s: Stage) {
  if (s.flowRunning) return;
  s.flowRunning = true;
  let last = 0;
  let frames = 0;
  s.animate(now => {
    const active = [...s.cables.values()].filter(c => c.direction !== 0);
    if (!s.flowAllowed || !active.length) {
      s.flowRunning = false;
      return false;
    }
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    for (const c of active) c.obj.dashes.offset.x -= (c.direction * dt) / flowDuration(c.watts);
    if (++frames % 2 === 0) s.render('draw');
    return true;
  });
}

/** Une porte s'ouvre, un volet descend : en douceur, jusqu'à l'ouverture demandée. */
function swing(s: Stage, entry: PartEntry) {
  const from = entry.value;
  const to = entry.target;
  let start = 0;
  return (now: number) => {
    // Remplacé par un mouvement plus récent, ou retiré de la scène.
    if (entry.target !== to || !entry.obj.object.parent) return false;
    start ||= now;
    const t = Math.min(1, (now - start) / SWING_MS);
    entry.value = from + (to - from) * easeInOut(t);
    entry.obj.apply(entry.value);
    // Hors de la maquette, il ne cache aucune pastille : seules ses ombres bougent.
    s.render('shadows');
    return t < 1;
  };
}

/** Couleur de la maquette sous ce point, vu de la caméra : texture moyennée autour, teinte du matériau. */
let sampler: CanvasRenderingContext2D | null = null;
function colorAt(s: Stage, local: Vec3): string | null {
  if (!s.root) return null;
  const target = s.root.localToWorld(new Vector3(...local));
  raycaster.set(s.camera.position, target.clone().sub(s.camera.position).normalize());
  const hit = raycaster.intersectObject(s.root, true).find(h => !isCut(s, h.point));
  if (!hit) return null;
  const material = materialsOf(hit.object)[hit.face?.materialIndex ?? 0] as MeshStandardMaterial | undefined;
  const color = material?.color?.clone() ?? new Color(1, 1, 1);
  const image = material?.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (image?.width && hit.uv) {
    sampler ??= Object.assign(document.createElement('canvas'), { width: 5, height: 5 }).getContext('2d', { willReadFrequently: true });
    if (sampler) {
      // Un carré de 5 × 5 pixels : un seul tomberait sur une veine du bois.
      const x = Math.floor((hit.uv.x - Math.floor(hit.uv.x)) * image.width) - 2;
      const y = Math.floor((hit.uv.y - Math.floor(hit.uv.y)) * image.height) - 2;
      sampler.clearRect(0, 0, 5, 5);
      sampler.drawImage(image, x, y, 5, 5, 0, 0, 5, 5);
      const data = sampler.getImageData(0, 0, 5, 5).data;
      const mean = [0, 1, 2].map(c => data.filter((_, i) => i % 4 === c).reduce((a, b) => a + b, 0) / 25 / 255);
      color.multiply(new Color().setRGB(mean[0], mean[1], mean[2], SRGBColorSpace));
    }
  }
  return `#${color.getHexString()}`;
}

/**
 * Le rectangle qu'on dessine, par-dessus tout — il suit la souris jusqu'au
 * second coin : on vise l'ouverture, pas au jugé.
 */
function placeOutline(s: Stage, corners: [Vec3, Vec3] | null | undefined) {
  if (!corners || !s.root) {
    if (s.outline?.visible) {
      s.outline.visible = false;
      s.render('draw');
    }
    return;
  }
  const a = s.root.localToWorld(new Vector3(...corners[0]));
  const b = s.root.localToWorld(new Vector3(...corners[1]));
  const bottom = Math.min(a.y, b.y);
  const top = Math.max(a.y, b.y);
  const points = new Float32BufferAttribute([a.x, bottom, a.z, b.x, bottom, b.z, b.x, top, b.z, a.x, top, a.z], 3);
  if (!s.outline) {
    const overlay = { depthTest: false, transparent: true, color: 0xfbbf24 };
    const fill = new BufferGeometry().setIndex([0, 1, 2, 0, 2, 3]);
    s.outline = new Group().add(
      new Mesh(fill, new MeshBasicMaterial({ ...overlay, opacity: 0.22, side: DoubleSide })),
      new LineLoop(new BufferGeometry(), new LineBasicMaterial(overlay))
    );
    s.outline.renderOrder = 10;
    s.outline.children.forEach(child => (child.renderOrder = 10));
    s.scene.add(s.outline);
  }
  for (const child of s.outline.children) (child as Mesh).geometry.setAttribute('position', points);
  s.outline.visible = true;
  s.render('draw');
}

/** Tracés au sol, un rien au-dessus du sol pour ne pas s'y confondre. */
const FLOOR_LIFT = 0.03;

/** Remplis et cernés d'après leur contour ; tout refait à chaque changement — ils sont peu nombreux. */
function placeFloors(s: Stage, floors: FloorOverlay[] | undefined) {
  for (const child of [...s.floors.children]) {
    s.floors.remove(child);
    disposeTree(child);
  }
  const root = s.root;
  if (root) {
    for (const floor of floors ?? []) {
      if (!floor.points.length) continue;
      const world = floor.points.map(([x, z]) => root.localToWorld(new Vector3(x, floor.y, z)));
      const y = world[0].y + FLOOR_LIFT;
      if (floor.fill > 0 && world.length >= 3) {
        // Le contour dessiné dans le plan (x, z), couché au sol.
        const fill = new Mesh(
          new ShapeGeometry(new Shape(world.map(p => new Vector2(p.x, p.z)))),
          new MeshBasicMaterial({ color: floor.color, transparent: true, opacity: floor.fill, depthWrite: false, side: DoubleSide })
        );
        fill.rotation.x = Math.PI / 2;
        fill.position.y = y;
        fill.renderOrder = 5;
        s.floors.add(fill);
      }
      const line = new (floor.closed ? LineLoop : Line)(
        new BufferGeometry().setAttribute(
          'position',
          new Float32BufferAttribute(
            world.flatMap(p => [p.x, y, p.z]),
            3
          )
        ),
        new LineBasicMaterial({ color: floor.color, transparent: true, opacity: 0.9, depthTest: false })
      );
      line.renderOrder = 6;
      s.floors.add(line);
    }
  }
  s.render('draw');
}

function disposeTree(root: Object3D) {
  root.traverse(o => {
    (o as Mesh).geometry?.dispose();
    for (const material of materialsOf(o)) {
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && (value as Texture).isTexture) (value as Texture).dispose();
      }
      material.dispose();
    }
  });
}

export default function Floorplan3D({
  ref,
  model,
  camera,
  sunElevation,
  sunAzimuth,
  north,
  cloudiness,
  shadows,
  cutaway,
  idleRotate,
  lampGlow,
  compass,
  lamps,
  parts,
  cables,
  flowing,
  onFrame,
  onPick,
  onHover,
  onOrbit,
  outline,
  floors,
  focus,
  anchors,
  onOcclusion,
  onLoad,
  onError,
}: Floorplan3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  // Dernières valeurs, lues par des écouteurs posés une fois pour toutes.
  const latest = useRef({ camera, lamps, parts, cables, floors, anchors, onFrame, onPick, onHover, onOrbit, onOcclusion, onLoad, onError });
  useLayoutEffect(() => {
    latest.current = { camera, lamps, parts, cables, floors, anchors, onFrame, onPick, onHover, onOrbit, onOcclusion, onLoad, onError };
  });

  // ── Scène, caméra, rendu ───────────────────────────────────────────────────
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // Tablette trop ancienne, ou WebGL coupé par le navigateur.
      latest.current.onError('webgl');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = ACESFilmicToneMapping;
    // Un cran plus clair que le rendu neutre : ACES assombrit les tons moyens,
    // et l'on regarde surtout des intérieurs.
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.type = PCFShadowMap;
    // Les ombres ne sont recalculées que quand elles changent : ni la caméra
    // ni le courant dans les câbles ne les déplacent.
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const cam = new PerspectiveCamera(FOV, 1, 0.1, MODEL_SIZE * 20);
    const controls = new OrbitControls(cam, renderer.domElement);
    // Ni si près ou si loin qu'on s'y perde. L'inclinaison dépend de la coupe
    // des murs (`applyCutaway`).
    controls.minDistance = MODEL_SIZE * 0.25;
    controls.maxDistance = MODEL_SIZE * 3;
    // Au repos : un tour en deux minutes, la caméra mise à jour 30 fois par
    // seconde (cf. la rotation au repos).
    controls.autoRotateSpeed = 1;

    const hemi = new HemisphereLight(0xdde6ff, 0x3b3328, 1);
    const sun = new DirectionalLight(0xfff1dc, 3);
    sun.shadow.mapSize.set(2048, 2048);
    const half = MODEL_SIZE * 0.6;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: MODEL_SIZE * 4 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    scene.add(hemi, sun, sun.target);

    // Rendu à la demande : une maison immobile n'a pas à être redessinée
    // soixante fois par seconde — sur une tablette murale, c'est de la
    // chaleur et de la batterie pour rien. Une seule image par frame, même si
    // plusieurs changements arrivent ensemble. Une animation, elle, demande
    // des frames tant qu'elle dure — et n'est redessinée que si elle a changé
    // quelque chose.
    let frame = 0;
    let dirty = false;
    // La scène ou la caméra ont bougé : pastilles à recaler, occlusion à revérifier.
    let moved = false;
    let shadowsDirty = true;
    const animators = new Set<(now: number) => boolean>();
    // Ce que la maquette cache : vérifié une fois la scène posée, quelques
    // rayons par image ; une nouvelle image annule la vérification en cours.
    let settle = 0;
    let checking = 0;
    const checkOcclusion = () => {
      const root = s.root;
      if (!root || !latest.current.anchors || !latest.current.onOcclusion) return;
      const queue = Object.entries(latest.current.anchors);
      const hidden = new Set<string>();
      const step = () => {
        const until = performance.now() + OCCLUSION_BUDGET_MS;
        while (queue.length && performance.now() < until) {
          const [id, anchor] = queue.pop()!;
          if (occluded(s, root, anchor)) hidden.add(id);
        }
        if (queue.length) checking = requestAnimationFrame(step);
        else latest.current.onOcclusion?.(hidden);
      };
      step();
    };
    const tick = (now: number) => {
      // Pendant le tick, une demande de rendu ne planifie rien : on décide à la fin.
      frame = -1;
      for (const step of animators) if (!step(now)) animators.delete(step);
      if (dirty) {
        dirty = false;
        if (moved) updateCutaway(s);
        if (shadowsDirty) {
          renderer.shadowMap.needsUpdate = true;
          shadowsDirty = false;
        }
        renderer.render(scene, cam);
        if (moved) {
          moved = false;
          latest.current.onFrame();
          window.clearTimeout(settle);
          cancelAnimationFrame(checking);
          settle = window.setTimeout(checkOcclusion, SETTLE_MS);
        }
      }
      frame = animators.size || dirty ? requestAnimationFrame(tick) : 0;
    };
    const render = (what: 'all' | 'view' | 'shadows' | 'draw' = 'all') => {
      dirty = true;
      if (what === 'all' || what === 'view') moved = true;
      if (what === 'all' || what === 'shadows') shadowsDirty = true;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const animate = (step: (now: number) => boolean) => {
      animators.add(step);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    controls.addEventListener('change', () => render('view'));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      render('view');
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const uniforms = createModelUniforms();
    const s: Stage = {
      renderer,
      scene,
      camera: cam,
      controls,
      sun,
      hemi,
      root: null,
      depth: { model: depthMaterial(uniforms, true), generated: depthMaterial(uniforms, false) },
      lamps: new Map(),
      lampGlow: false,
      glowMap: null,
      parts: new Map(),
      cables: new Map(),
      flowAllowed: false,
      flowRunning: false,
      outline: null,
      floors: new Group(),
      uniforms,
      cutaway: false,
      cut: null,
      home: null,
      flight: 0,
      render,
      animate,
    };
    stage.current = s;
    scene.add(s.floors);
    resize();

    // Un clic pose ; un glisser fait tourner la caméra et ne pose rien.
    let down: { x: number; y: number; moved?: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || e.button !== 0 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_TOLERANCE) return;
      latest.current.onPick?.(pick(s, e.clientX, e.clientY), e.clientX, e.clientY);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    // Survol : un lancer de rayon par image au plus, et seulement pendant un dessin.
    let hoverFrame = 0;
    const onMove = (e: PointerEvent) => {
      // Tourner la maison à la main interrompt un vol en cours, et la boussole.
      if (down && !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_TOLERANCE) {
        down.moved = true;
        s.flight++;
        latest.current.onOrbit?.();
      }
      if (!latest.current.onHover || hoverFrame) return;
      const { clientX, clientY } = e;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        latest.current.onHover?.(pick(s, clientX, clientY));
      });
    };
    renderer.domElement.addEventListener('pointermove', onMove);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(hoverFrame);
      cancelAnimationFrame(checking);
      window.clearTimeout(settle);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      disposeTree(scene);
      s.depth.model.dispose();
      s.depth.generated.dispose();
      renderer.dispose();
      // Rendre le contexte tout de suite : un navigateur n'en garde qu'une
      // poignée, et changer de page en boucle finirait par les épuiser.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      stage.current = null;
    };
  }, []);

  // ── Maquette ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stage.current) return;
    let cancelled = false;
    new GLTFLoader().load(
      model,
      gltf => {
        const s = stage.current;
        if (cancelled || !s) return;
        const root = gltf.scene;
        // Toute maquette ramenée à la même taille, posée au sol au centre :
        // caméra, soleil et lampes se règlent une fois pour toutes, que
        // l'export soit en centimètres ou en mètres.
        const size = new Box3().setFromObject(root).getSize(new Vector3()).length() || 1;
        root.scale.setScalar(MODEL_SIZE / size);
        root.updateMatrixWorld(true);
        const box = new Box3().setFromObject(root);
        const center = box.getCenter(new Vector3());
        root.position.set(-center.x, -box.min.y, -center.z);
        root.updateMatrixWorld(true);
        root.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true;
        });
        if (s.root) {
          s.scene.remove(s.root);
          disposeTree(s.root);
        }
        s.scene.add(root);
        s.root = root;
        patchModel(root, s.uniforms, s.depth.model);
        // Emprise, une fois la maquette posée au sol et centrée. Les murs
        // partent debout, et s'abaissent en glissant : la maison s'ouvre.
        const { min, max } = new Box3().setFromObject(root);
        const top = max.y + 0.01;
        s.cut = {
          height: top,
          box: [min.x, min.z, max.x, max.z],
          sides: [top, top, top, top],
          margin: BACK_WALL_MARGIN,
          top,
          low: (max.y - min.y) * CUTAWAY_HEIGHT,
          back: [true, true, true, true],
          sliding: false,
        };
        s.uniforms.fpCutaway.value.set(top, top, BACK_WALL_MARGIN, CAP_DEPTH);
        s.uniforms.fpBox.value.set(...s.cut.box);
        s.uniforms.fpSides.value.set(...s.cut.sides);
        applyCutaway(s);
        // Placés d'après la maquette : tous reconstruits sur la nouvelle.
        for (const id of s.parts.keys()) removeGenerated(s, s.parts, id);
        placeParts(s, latest.current.parts);
        for (const id of s.cables.keys()) removeGenerated(s, s.cables, id);
        placeCables(s, latest.current.cables ?? []);
        placeFloors(s, latest.current.floors);
        placeLamps(s, latest.current.lamps);
        s.home = null;
        s.flight++;
        applyView(s, latest.current.camera);
        // `applyView` ne redessine que si la caméra a bougé : une autre
        // maquette vue du même point n'en provoquerait aucun.
        s.render();
        latest.current.onLoad();
      },
      undefined,
      () => {
        if (!cancelled) latest.current.onError('model');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [model]);

  // ── Soleil ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const light = sunLighting({ elevation: sunElevation, azimuth: sunAzimuth }, north, cloudiness);
    s.sun.position.set(...light.dir).multiplyScalar(MODEL_SIZE * 2);
    s.sun.intensity = light.sun;
    s.sun.color.setRGB(light.color[0] / 255, light.color[1] / 255, light.color[2] / 255, SRGBColorSpace);
    s.sun.shadow.radius = light.softness;
    s.sun.shadow.intensity = light.shadow;
    // Les pièces, qu'on voit par-dessus les murets, ne reçoivent guère que
    // cette lumière-là : plus généreuse que le soleil ne le voudrait.
    s.hemi.intensity = light.ambient * AMBIENT_BOOST;
    const cast = shadows && light.sun > 0;
    if (s.renderer.shadowMap.enabled !== cast) {
      s.renderer.shadowMap.enabled = cast;
      // Les matériaux déjà compilés ne verraient pas le changement.
      s.scene.traverse(o => materialsOf(o).forEach(m => (m.needsUpdate = true)));
    }
    s.sun.castShadow = cast;
    s.render('shadows');
  }, [sunElevation, sunAzimuth, north, cloudiness, shadows]);

  // ── Lampes ─────────────────────────────────────────────────────────────────
  // Clé sérialisée : le tableau est neuf à chaque rendu du parent, et chaque
  // image rendue en provoque un — l'effet ne doit repartir que si une lampe
  // a réellement changé.
  const lampsKey = JSON.stringify(lamps);
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.lampGlow = lampGlow;
    placeLamps(s, latest.current.lamps);
    // Sans ombres, une lampe ne change que l'image. Recaler les pastilles, puis
    // revérifier ce que la maquette cache, relancerait l'effet : une lueur
    // suit sa pastille, cachée ou non.
    s.render('draw');
  }, [lampsKey, lampGlow]);

  // ── Câbles d'énergie ───────────────────────────────────────────────────────
  const cablesKey = JSON.stringify(cables ?? []);
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.flowAllowed = !!flowing;
    placeCables(s, latest.current.cables ?? []);
  }, [cablesKey, flowing]);

  // ── Portes, fenêtres, volets ───────────────────────────────────────────────
  const partsKey = JSON.stringify(parts);
  useEffect(() => {
    const s = stage.current;
    if (s) placeParts(s, latest.current.parts);
  }, [partsKey]);

  const floorsKey = JSON.stringify(floors ?? []);
  useEffect(() => {
    if (stage.current) placeFloors(stage.current, latest.current.floors);
  }, [floorsKey]);

  const outlineKey = JSON.stringify(outline ?? null);
  useEffect(() => {
    if (stage.current) placeOutline(stage.current, outline);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clé sérialisée
  }, [outlineKey]);

  // ── Vol vers une pièce ─────────────────────────────────────────────────────
  // À l'aller, la vue de départ est gardée : le retour y ramène.
  const focusKey = JSON.stringify(focus ?? null);
  useEffect(() => {
    const s = stage.current;
    if (!s?.root) return;
    const to = focus ? roomView(s, s.root, focus) : s.home;
    s.home = focus ? (s.home ?? currentView(s)) : null;
    if (to) fly(s, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clé sérialisée
  }, [focusKey]);

  // ── Murs en coupe ──────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.cutaway = cutaway;
    applyCutaway(s);
    s.render();
  }, [cutaway]);

  // ── Boussole ───────────────────────────────────────────────────────────────
  // La caméra regarde vers le cap du téléphone. Elle le suit en douceur, et
  // reste immobile tant qu'il ne bouge pas d'un degré : pas une image de trop.
  useEffect(() => {
    const s = stage.current;
    if (!s || !compass) return;
    let goal: number | null = null;
    let turning = false;
    let last = 0;
    const azimuth = () => new Spherical().setFromVector3(s.camera.position.clone().sub(s.controls.target));
    const step = (now: number) => {
      if (goal === null) return (turning = false);
      const k = 1 - Math.exp(-(last ? now - last : 16) / COMPASS_SMOOTH_MS);
      last = now;
      const at = azimuth();
      const turn = shortestTurn(at.theta, goal);
      at.theta += turn * k;
      s.camera.position.setFromSpherical(at).add(s.controls.target);
      s.controls.update();
      turning = Math.abs(turn) > COMPASS_DEADBAND / 10;
      if (!turning) last = 0;
      return turning;
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      const heading = compassHeading(e.alpha, screen.orientation?.angle);
      if (heading === null) return;
      // Le nord de la maquette est −z, tourné de `north` : la caméra se place
      // à l'opposé du cap, et regarde vers lui.
      goal = (-(heading + north) * Math.PI) / 180;
      if (!turning && Math.abs(shortestTurn(azimuth().theta, goal)) > COMPASS_DEADBAND) {
        turning = true;
        s.animate(step);
      }
    };
    window.addEventListener('deviceorientationabsolute', onOrientation);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      goal = null;
    };
  }, [compass, north]);

  // ── Rotation au repos ──────────────────────────────────────────────────────
  // Le moindre geste, n'importe où sur la page, l'arrête et relance l'attente.
  useEffect(() => {
    const s = stage.current;
    if (!s || !idleRotate) return;
    let spinning = false;
    let timer = 0;
    let frames = 0;
    const spin = () => {
      spinning = true;
      s.controls.autoRotate = true;
      s.animate(() => {
        // Une image sur deux : une maison qui tourne lentement n'a pas besoin
        // de soixante images par seconde, et la tablette chauffe moins.
        if (spinning && ++frames % 2 === 0) s.controls.update();
        return spinning;
      });
    };
    const wake = () => {
      spinning = false;
      s.controls.autoRotate = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(spin, IDLE_MS);
    };
    const events = ['pointerdown', 'wheel', 'keydown'] as const;
    for (const event of events) window.addEventListener(event, wake, { passive: true });
    wake();
    return () => {
      for (const event of events) window.removeEventListener(event, wake);
      window.clearTimeout(timer);
      spinning = false;
      s.controls.autoRotate = false;
    };
  }, [idleRotate]);

  useImperativeHandle(
    ref,
    () => ({
      project(anchor) {
        const s = stage.current;
        if (!s?.root) return null;
        const v = anchorPoint(s, s.root, anchor).project(s.camera);
        if (v.z < -1 || v.z > 1) return null;
        return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
      },
      pick: (clientX, clientY) => (stage.current ? pick(stage.current, clientX, clientY) : null),
      floorAt: (clientX, clientY, y) => (stage.current ? floorAt(stage.current, clientX, clientY, y) : null),
      view: () => (stage.current ? currentView(stage.current) : null),
      resetView() {
        const s = stage.current;
        if (!s) return;
        s.home = null;
        s.flight++;
        applyView(s, latest.current.camera);
      },
      invalidate() {
        stage.current?.render('view');
      },
      colorAt: point => (stage.current ? colorAt(stage.current, point) : null),
      facing(a, b) {
        const s = stage.current;
        const frame = partFrame(a, b);
        if (!s?.root || !frame) return 1;
        const middle = s.root.localToWorld(new Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
        const toCamera = s.camera.position.clone().sub(middle);
        return toCamera.x * frame.n[0] + toCamera.z * frame.n[2] >= 0 ? 1 : -1;
      },
    }),
    []
  );

  return <div ref={hostRef} data-floorplan-3d className='absolute inset-0' />;
}

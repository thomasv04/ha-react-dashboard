import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sphere,
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
  CUTAWAY_HEIGHT,
  cutLimit,
  isCutAway,
  MODEL_SIZE,
  partFrame,
  sunLighting,
  type Cutaway,
  type FloorplanPart,
  type Sides,
  type Vec3,
} from '@/lib/floorplan';
import { createModelUniforms, materialsOf, patchModel, setCuts, setCutawaySides, type ModelUniforms } from './modelPatch';
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
}

/** Porte, fenêtre ou volet, et son ouverture de l'instant (0 à 1). */
export type PartProp = FloorplanPart & { open: number };

export interface Floorplan3DHandle {
  /** Point de la maquette → position à l'écran, en % du canevas ; `null` s'il est derrière la caméra. */
  project(anchor: Vec3): { x: number; y: number } | null;
  /** Point de la maquette sous ce point de l'écran, ou `null` s'il n'y a que du vide. */
  pick(clientX: number, clientY: number): Vec3 | null;
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
  lamps: Lamp[];
  parts: PartProp[];
  /** Après chaque image : la caméra a pu bouger, les pastilles se recalent. */
  onFrame: () => void;
  /** Clic — pas un glisser, qui fait tourner — sur la maquette. */
  onPick?: (anchor: Vec3, clientX: number, clientY: number) => void;
  /** Point de la maquette sous le pointeur, quand il bouge — pour dessiner. */
  onHover?: (anchor: Vec3 | null) => void;
  /** Rectangle en cours de dessin : deux coins opposés, dans les coordonnées de la maquette. */
  outline?: [Vec3, Vec3] | null;
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

interface PartEntry {
  obj: PartObject;
  /** Forme de l'élément : reconstruit quand elle change, pas quand il s'ouvre. */
  key: string;
  /** Ombres de l'élément, retouchées comme lui. */
  depth: Material;
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
  /** Ombres de la maquette, retouchées comme elle — à libérer avec elle. */
  depth: Material | null;
  lamps: Map<string, PointLight>;
  parts: Map<string, PartEntry>;
  /** Rectangle en cours de dessin, créé au premier besoin. */
  outline: Group | null;
  /** Retouches des matériaux de la maquette (coupe, découpes), partagées par tous. */
  uniforms: ModelUniforms;
  cutaway: boolean;
  /** Géométrie de la coupe — `null` tant qu'aucune maquette n'est chargée. */
  cut: CutState | null;
  render: () => void;
  /** Une image par frame tant que `step` rend `true` — le temps d'une animation. */
  animate: (step: (now: number) => boolean) => void;
}

const raycaster = new Raycaster();
const pointer = new Vector2();

/** Point de la scène retiré par la coupe des murs — invisible, donc ni cliquable ni support de pastille. */
function isCut(s: Stage, point: Vector3) {
  return !!s.cut && isCutAway(point.toArray() as Vec3, s.cut);
}

function pick(s: Stage, clientX: number, clientY: number): Vec3 | null {
  if (!s.root) return null;
  const rect = s.renderer.domElement.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, s.camera);
  // Le lancer de rayon ignore la coupe, faite dans les shaders : sans ce tri,
  // un clic tomberait sur un mur qu'on ne voit plus.
  const hit = raycaster.intersectObject(s.root, true).find(h => !isCut(s, h.point));
  // Coordonnées de la maquette elle-même, pas de la scène : elles survivent à
  // un changement de taille ou de centrage au prochain chargement.
  return hit ? (s.root.worldToLocal(hit.point.clone()).toArray() as Vec3) : null;
}

/**
 * Vue d'accueil par défaut : la maquette entière dans le cadre. La sphère qui
 * l'englobe doit tenir dans le plus étroit des deux angles de vue — le
 * vertical sur un écran large, l'horizontal sur une tablette en portrait.
 */
function defaultView(s: Stage): FloorplanView3D {
  const box = s.root ? new Box3().setFromObject(s.root) : null;
  const radius = box ? box.getBoundingSphere(new Sphere()).radius : MODEL_SIZE / 2;
  const target = box ? box.getCenter(new Vector3()).setY(0) : new Vector3();
  const vertical = (FOV * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * s.camera.aspect);
  // 0,85 : la sphère déborde largement d'une maison, plus plate que haute.
  const distance = (radius * 0.85) / Math.sin(Math.min(vertical, horizontal) / 2);
  return {
    position: target.clone().addScaledVector(DEFAULT_DIRECTION, distance).toArray() as Vec3,
    target: target.toArray() as Vec3,
  };
}

function applyView(s: Stage, view: FloorplanView3D | undefined) {
  const { position, target } = view ?? defaultView(s);
  s.camera.position.set(...position);
  s.controls.target.set(...target);
  s.controls.update(); // émet `change`, donc un rendu
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
      s.scene.add(light);
      s.lamps.set(lamp.id, light);
    }
    if (lamp.color) light.color.setRGB(lamp.color[0] / 255, lamp.color[1] / 255, lamp.color[2] / 255, SRGBColorSpace);
    light.intensity = lamp.color ? LAMP_POWER * Math.max(0.15, lamp.brightness) : 0;
    light.distance = lamp.range;
    const at = new Vector3(...lamp.anchor);
    if (s.root) s.root.localToWorld(at);
    light.position.set(at.x, at.y + LAMP_LIFT, at.z);
  }
  for (const [id, light] of s.lamps) {
    if (seen.has(id)) continue;
    s.scene.remove(light);
    light.dispose();
    s.lamps.delete(id);
  }
}

function cutawaySides(s: Stage, on: boolean) {
  if (s.root) setCutawaySides(s.root, on);
  for (const entry of s.parts.values()) setCutawaySides(entry.obj.object, on);
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
  for (const { open, ...part } of parts) {
    seen.add(part.id);
    const key = JSON.stringify(part);
    let entry = s.parts.get(part.id);
    if (entry && entry.key !== key) {
      removePart(s, part.id, entry);
      entry = undefined;
    }
    if (!entry) {
      const obj = buildPart(part, s.root);
      if (!obj) continue;
      // Coupé par les murets comme la maquette, mais pas par les découpes :
      // il occupe justement celle de l'original.
      const depth = patchModel(obj.object, s.uniforms, false);
      if (s.cutaway) setCutawaySides(obj.object, true);
      obj.apply(open);
      s.scene.add(obj.object);
      entry = { obj, key, depth, value: open, target: open };
      s.parts.set(part.id, entry);
    }
    if (entry.target !== open) {
      entry.target = open;
      s.animate(swing(s, entry));
    }
  }
  for (const [id, entry] of s.parts) if (!seen.has(id)) removePart(s, id, entry);
  setCuts(
    s.uniforms,
    [...s.parts.values()].flatMap(entry => (entry.obj.cut ? [entry.obj.cut] : []))
  );
  s.render();
}

function removePart(s: Stage, id: string, entry: PartEntry) {
  s.scene.remove(entry.obj.object);
  entry.obj.dispose();
  entry.depth.dispose();
  s.parts.delete(id);
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
    entry.value = from + (to - from) * (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
    entry.obj.apply(entry.value);
    s.render();
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
      s.render();
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
  s.render();
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
  lamps,
  parts,
  onFrame,
  onPick,
  onHover,
  outline,
  onLoad,
  onError,
}: Floorplan3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  // Dernières valeurs, lues par des écouteurs posés une fois pour toutes.
  const latest = useRef({ camera, lamps, parts, onFrame, onPick, onHover, onLoad, onError });
  useLayoutEffect(() => {
    latest.current = { camera, lamps, parts, onFrame, onPick, onHover, onLoad, onError };
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
    const animators = new Set<(now: number) => boolean>();
    const tick = (now: number) => {
      // Pendant le tick, une demande de rendu ne planifie rien : on décide à la fin.
      frame = -1;
      for (const step of animators) if (!step(now)) animators.delete(step);
      if (dirty) {
        dirty = false;
        updateCutaway(s);
        renderer.render(scene, cam);
        latest.current.onFrame();
      }
      frame = animators.size || dirty ? requestAnimationFrame(tick) : 0;
    };
    const render = () => {
      dirty = true;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const animate = (step: (now: number) => boolean) => {
      animators.add(step);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    controls.addEventListener('change', render);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const s: Stage = {
      renderer,
      scene,
      camera: cam,
      controls,
      sun,
      hemi,
      root: null,
      depth: null,
      lamps: new Map(),
      parts: new Map(),
      outline: null,
      uniforms: createModelUniforms(),
      cutaway: false,
      cut: null,
      render,
      animate,
    };
    stage.current = s;
    resize();

    // Un clic pose ; un glisser fait tourner la caméra et ne pose rien.
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || e.button !== 0 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_TOLERANCE) return;
      if (!latest.current.onPick) return;
      const anchor = pick(s, e.clientX, e.clientY);
      if (anchor) latest.current.onPick(anchor, e.clientX, e.clientY);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    // Survol : un lancer de rayon par image au plus, et seulement pendant un dessin.
    let hoverFrame = 0;
    const onMove = (e: PointerEvent) => {
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
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      disposeTree(scene);
      s.depth?.dispose();
      for (const entry of s.parts.values()) entry.depth.dispose();
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
          s.depth?.dispose();
        }
        s.scene.add(root);
        s.root = root;
        s.depth = patchModel(root, s.uniforms);
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
        for (const [id, entry] of s.parts) removePart(s, id, entry);
        placeParts(s, latest.current.parts);
        placeLamps(s, latest.current.lamps);
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
    s.render();
  }, [sunElevation, sunAzimuth, north, cloudiness, shadows]);

  // ── Lampes ─────────────────────────────────────────────────────────────────
  // Clé sérialisée : le tableau est neuf à chaque rendu du parent, et chaque
  // image rendue en provoque un — l'effet ne doit repartir que si une lampe
  // a réellement changé.
  const lampsKey = JSON.stringify(lamps);
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    placeLamps(s, latest.current.lamps);
    s.render();
  }, [lampsKey]);

  // ── Portes, fenêtres, volets ───────────────────────────────────────────────
  const partsKey = JSON.stringify(parts);
  useEffect(() => {
    const s = stage.current;
    if (s) placeParts(s, latest.current.parts);
  }, [partsKey]);

  const outlineKey = JSON.stringify(outline ?? null);
  useEffect(() => {
    if (stage.current) placeOutline(stage.current, outline);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clé sérialisée
  }, [outlineKey]);

  // ── Murs en coupe ──────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.cutaway = cutaway;
    applyCutaway(s);
    s.render();
  }, [cutaway]);

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
        const point = s.root.localToWorld(new Vector3(...anchor));
        // Accrochée en haut d'un mur coupé : posée sur ce qu'il en reste,
        // plutôt que de flotter dans le vide.
        if (s.cut && isCut(s, point)) point.y = cutLimit(point.toArray() as Vec3, s.cut);
        const v = point.project(s.camera);
        if (v.z < -1 || v.z > 1) return null;
        return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
      },
      pick: (clientX, clientY) => (stage.current ? pick(stage.current, clientX, clientY) : null),
      view() {
        const s = stage.current;
        return s ? { position: s.camera.position.toArray() as Vec3, target: s.controls.target.toArray() as Vec3 } : null;
      },
      resetView() {
        if (stage.current) applyView(stage.current, latest.current.camera);
      },
      invalidate() {
        stage.current?.render();
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

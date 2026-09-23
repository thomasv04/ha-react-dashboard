import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODEL_SIZE, sunLighting, type Vec3 } from '@/lib/floorplan';

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
}

interface Floorplan3DProps {
  ref?: Ref<Floorplan3DHandle>;
  model: string;
  camera?: FloorplanView3D;
  sunElevation?: number;
  sunAzimuth?: number;
  north: number;
  shadows: boolean;
  lamps: Lamp[];
  /** Après chaque image : la caméra a pu bouger, les pastilles se recalent. */
  onFrame: () => void;
  /** Clic — pas un glisser, qui fait tourner — sur la maquette. */
  onPick?: (anchor: Vec3, clientX: number, clientY: number) => void;
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

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  sun: DirectionalLight;
  hemi: HemisphereLight;
  root: Object3D | null;
  lamps: Map<string, PointLight>;
  render: () => void;
}

const raycaster = new Raycaster();
const pointer = new Vector2();

function pick(s: Stage, clientX: number, clientY: number): Vec3 | null {
  if (!s.root) return null;
  const rect = s.renderer.domElement.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, s.camera);
  const hit = raycaster.intersectObject(s.root, true)[0];
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

function materialsOf(object: Object3D): Material[] {
  const material = (object as Mesh).material;
  return Array.isArray(material) ? material : material ? [material] : [];
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
  shadows,
  lamps,
  onFrame,
  onPick,
  onLoad,
  onError,
}: Floorplan3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  // Dernières valeurs, lues par des écouteurs posés une fois pour toutes.
  const latest = useRef({ camera, lamps, onFrame, onPick, onLoad, onError });
  useLayoutEffect(() => {
    latest.current = { camera, lamps, onFrame, onPick, onLoad, onError };
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
    renderer.shadowMap.type = PCFShadowMap;
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const cam = new PerspectiveCamera(FOV, 1, 0.1, MODEL_SIZE * 20);
    const controls = new OrbitControls(cam, renderer.domElement);
    // Toujours en surplomb : une maquette sans toit se lit d'en haut. Plus bas,
    // on ne voit plus que des murs, et les pastilles — qui ne sont jamais
    // masquées — flottent devant eux. Ni si près ou si loin qu'on s'y perde.
    controls.maxPolarAngle = Math.PI * 0.35;
    controls.minDistance = MODEL_SIZE * 0.25;
    controls.maxDistance = MODEL_SIZE * 3;

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
    // plusieurs changements arrivent ensemble.
    let frame = 0;
    const render = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderer.render(scene, cam);
        latest.current.onFrame();
      });
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

    const s: Stage = { renderer, scene, camera: cam, controls, sun, hemi, root: null, lamps: new Map(), render };
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

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      disposeTree(scene);
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
    const light = sunLighting({ elevation: sunElevation, azimuth: sunAzimuth }, north);
    s.sun.position.set(...light.dir).multiplyScalar(MODEL_SIZE * 2);
    s.sun.intensity = light.sun;
    s.hemi.intensity = light.ambient;
    const cast = shadows && light.sun > 0;
    if (s.renderer.shadowMap.enabled !== cast) {
      s.renderer.shadowMap.enabled = cast;
      // Les matériaux déjà compilés ne verraient pas le changement.
      s.scene.traverse(o => materialsOf(o).forEach(m => (m.needsUpdate = true)));
    }
    s.sun.castShadow = cast;
    s.render();
  }, [sunElevation, sunAzimuth, north, shadows]);

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

  useImperativeHandle(
    ref,
    () => ({
      project(anchor) {
        const s = stage.current;
        if (!s?.root) return null;
        const v = s.root.localToWorld(new Vector3(...anchor)).project(s.camera);
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
    }),
    []
  );

  return <div ref={hostRef} data-floorplan-3d className='absolute inset-0' />;
}

import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import {
  Box as BoxIcon,
  ChevronLeft,
  Compass,
  DoorOpen,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers,
  Map as MapIcon,
  RotateCcw,
  Sun,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { usePages, type FloorplanConfig } from '@/context/PageContext';
import { useDashboardLayout, useEditMode, type FloorplanPos, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { FreeGridScope } from '@/components/layout/DashboardGrid';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { ImageBackgroundPicker } from '@/components/layout/ThemeControlsModal/ImageBackgroundPicker';
import type { BackgroundConfig } from '@/config/themes';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { useEntities } from '@/hooks/useEntities';
import { useElementBox } from '@/hooks/useWidgetSize';
import { useFormats } from '@/hooks/useFormats';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { staggerGridContainer } from '@/lib/motion-variants';
import { assetUrl } from '@/lib/api-base';
import { colorAlpha } from '@/lib/color-value';
import { useTheme } from '@/context/ThemeContext';
import {
  cloudiness,
  containSize,
  DRAFT_COLOR,
  frostOf,
  isNightDimmed,
  isPresence,
  lightColor,
  lightGlow,
  MODEL_SIZE,
  cableFlow,
  normalizeAnchor,
  normalizeCables,
  normalizeParts,
  normalizeRooms,
  normalizePos,
  openness,
  partFrame,
  pointInPolygon,
  polygonCentroid,
  polylineMidpoint,
  precipitation,
  skyColors,
  stateAt,
  sunPosition,
  temperatureOf,
  thermalColor,
  type FloorplanCable,
  type FloorplanPart,
  type Vec3,
} from '@/lib/floorplan';
import { familyKind, normalizeOpenings, parseNodeName } from '@/lib/floorplan-openings';
import { cn, isTypingTarget } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { ChipCardConfig, WidgetConfig } from '@/types/widget-configs';
import type { CableProp, FloorOverlay, Floorplan3DHandle, Lamp, OpeningProp, PartProp, Project } from './Floorplan3D';
import { FloorplanItem } from './FloorplanItem';
import { DraftPopover } from './FloorplanDrawn';
import { PartList, PartPopover } from './FloorplanParts';
import { CableList, CableOverlay, CablePopover } from './FloorplanCables';
import { ReplayBar } from './FloorplanReplay';
import { RoomList, RoomNamePopover } from './FloorplanRooms';
import { Weather } from './FloorplanWeather';
import { useReplay } from './useReplay';
import { ModelPicker } from './ModelPicker';
import { EmptyTab, Segmented, SettingsPanel, ToggleRow, type SettingsTab, type Tool } from './FloorplanSettings';

// three.js ne se télécharge que pour une page qui a une maquette.
const Floorplan3D = lazy(() => import('./Floorplan3D'));

/** `vite --mode mock` : de quoi essayer la page sans Home Assistant. */
const MOCK = import.meta.env.MODE === 'mock';
const HOUR_MS = 3_600_000;

/** Proportions supposées tant que l'image n'est pas chargée. */
const DEFAULT_ASPECT = 16 / 9;

/** Porte, fenêtre ou volet en cours de dessin : son premier coin (et où il est à l'écran, en %), puis l'élément entier. */
type PartDraft = { a: Vec3; from: { x: number; y: number }; part?: FloorplanPart; around?: { left: number; right: number; y: number } };

/** Aperçu entrouvert d'un élément dessiné : on voit de quel côté s'ouvre la porte, où descend le volet. */
const DRAFT_OPENNESS = 0.35;
/**
 * Étoiles du ciel de nuit : quelques points par tuile, deux tailles de tuile
 * pour que la répétition ne se voie pas. Fixes : rien à animer, rien à payer.
 */
const STARS = {
  backgroundImage: [
    'radial-gradient(1px 1px at 12% 18%, #fff 60%, transparent)',
    'radial-gradient(1px 1px at 37% 64%, #fff 60%, transparent)',
    'radial-gradient(1.5px 1.5px at 58% 27%, #fff 60%, transparent)',
    'radial-gradient(1px 1px at 81% 72%, #dfe7ff 60%, transparent)',
    'radial-gradient(1px 1px at 69% 9%, #fff 60%, transparent)',
    'radial-gradient(1.5px 1.5px at 23% 88%, #fff 60%, transparent)',
    'radial-gradient(1px 1px at 91% 41%, #cfd9ff 60%, transparent)',
  ].join(', '),
  backgroundSize: [...Array(4).fill('230px 230px'), ...Array(3).fill('370px 370px')].join(', '),
};

/** Pièces : leur contour, en édition. */
const ROOM_COLOR = '#60a5fa';
/** En deçà (px) du premier sommet d'une pièce, du dernier point d'un câble, un clic ferme l'une, finit l'autre. */
const CLOSE_PX = 14;

/** Centre d'une pièce, à hauteur de son sol : là où s'écrit son nom. */
const roomCenter = ({ y, points }: { y: number; points: [number, number][] }): Vec3 => {
  const [x, z] = polygonCentroid(points);
  return [x, y, z];
};

/** Câble en cours de tracé : ses points, puis — tracé jusqu'au bout — le câble, dont on choisit l'entité. */
type CableDraft = { points: Vec3[]; cable?: FloorplanCable };

/** Identifiant d'un élément dessiné : sa sorte, et l'instant où on l'a posé. */
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
/** Le câble tracé jusqu'au bout — deux points au moins : reste à choisir son entité. */
const finishCable = (d: CableDraft): CableDraft => ({ ...d, cable: { id: newId('cable'), kind: 'home', entityId: '', points: d.points } });

/** Un point de la maquette à l'écran, en % du plan — `null` tant qu'elle n'est pas affichée, ou derrière la caméra. */
type ToScreen = (point: Vec3) => { x: number; y: number } | null;

/**
 * De quoi placer à l'écran un point de la maquette, renouvelé à chaque image
 * où la caméra bouge. Seuls ceux qui s'en servent (`Projected`) se
 * redessinent alors, pas la page : tant que la maison tourne, c'est trente
 * fois par seconde.
 */
function createProjector() {
  let current: Project | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: Project) {
      current = next;
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
type Projector = ReturnType<typeof createProjector>;

/** Ce qui se place sur la maquette : redessiné à chaque image où la caméra bouge, sans la page autour. */
function Projected({ projector, children }: { projector: Projector; children: (toScreen: ToScreen) => ReactNode }) {
  const project = useSyncExternalStore(projector.subscribe, projector.get);
  return children(point => project?.(point) ?? null);
}

/** Bouton rond, en bas de la maquette ; enfoncé, il prend la couleur `on`. */
function RoundButton({
  icon: Icon,
  label,
  onClick,
  pressed,
  on = 'text-sky-300',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  on?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      title={label}
      aria-label={label}
      className={cn('p-2.5 rounded-xl gc-overlay transition-colors', pressed ? on : 'text-white/60 hover:text-white')}
    >
      <Icon size={16} />
    </button>
  );
}

/**
 * Page `floorplan` : une image de la maison — ou une maquette 3D — et les
 * widgets posés dessus.
 *
 * Image : le plan occupe la place restante de l'écran, entier (`contain`), et
 * les éléments y sont placés en % pour rester sur la bonne pièce quelle que
 * soit la taille de l'écran. Couches, de bas en haut : image, halos, éléments.
 *
 * Maquette : elle remplit la place, on la fait tourner. Les pastilles y sont
 * accrochées à un point de la maquette et suivent la caméra ; les cards
 * restent posées en % de l'écran, par-dessus.
 */
export function FloorplanView() {
  const { t } = useI18n();
  const { currentPage, updatePage } = usePages();
  const { layout, addWidgetByType, updateWidget } = useDashboardLayout();
  const { isEditMode } = useEditMode();
  const { getWidgetConfig, updateWidgetConfig } = useWidgetConfig();
  // Sous l'écran de veille, la page reste montée : rien n'y bouge, pour rien.
  const { isActive: screensaver } = useWallPanel();
  const motionAllowed = useLowPowerMotion() && !screensaver;
  const { tokens, perfSettings } = useTheme();
  const { formatTime } = useFormats();

  const areaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const three = useRef<Floorplan3DHandle>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useElementBox(areaRef, (w, h) => setArea({ w, h }));
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Point cliqué, en % du plan — et de la maquette, s'il y en a une — où poser la prochaine pastille. */
  const [adding, setAdding] = useState<{ x: number; y: number; anchor?: Vec3 } | null>(null);
  /** Réglages ouverts : l'image ou la maquette d'un plan en 2D, un onglet de la maquette. */
  const [panel, setPanel] = useState<'image' | SettingsTab | null>(null);
  /** Onglet « Maquette » : le choix de la maquette, ou de l'image qui la remplacerait. */
  const [source, setSource] = useState<'model' | 'image'>('model');
  /** Maquette : ce que pose un clic — une pastille, ou un coin de porte, de fenêtre, de volet. */
  const [tool, setTool] = useState<Tool>('chip');
  const [cableDraft, setCableDraft] = useState<CableDraft | null>(null);
  /** Pièce en cours de dessin : ses sommets au sol, sa hauteur de sol, puis son nom. */
  const [roomDraft, setRoomDraft] = useState<{ points: [number, number][]; y: number; naming?: boolean } | null>(null);
  const [draft, setDraft] = useState<PartDraft | null>(null);
  /** Vue thermique : chaque pièce colorée selon sa température. */
  const [thermal, setThermal] = useState(false);
  /** Pièce vers laquelle la caméra a volé, hors édition. */
  const [focusId, setFocusId] = useState<string | null>(null);
  /** Boussole : la maison tourne avec le téléphone. */
  const [compass, setCompass] = useState(false);
  /** Pastilles que la maquette cache — vérifié quand la caméra s'arrête. */
  const [occluded, setOccluded] = useState<Set<string>>(() => new Set());
  /** Point sous le pointeur, entre les deux clics d'un dessin. */
  const [hover, setHover] = useState<Vec3 | null>(null);
  /** Coin d'un élément dessiné repris à la souris, le temps du glisser. */
  const [adjust, setAdjust] = useState<{ corner: 'a' | 'b'; point: Vec3 } | null>(null);

  // Maquette : chargée (sinon les pastilles accrochées n'ont pas encore de
  // position), en échec, et de quoi placer à l'écran un point de la maquette.
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ model: string; kind: 'webgl' | 'model' } | null>(null);
  const [projector] = useState(createProjector);

  const floorplan = currentPage?.floorplan;
  const image = floorplan?.image;
  const model = floorplan?.model;
  const widgets = layout.widgets.lg;
  /** Les pastilles : leur entité, leur point d'accroche sur la maquette. */
  const chips = widgets.flatMap(w => {
    if (w.type !== 'chip') return [];
    const config = getWidgetConfig<ChipCardConfig>(w.id);
    return [{ id: w.id, pos: w.pos, anchor: normalizeAnchor(w.pos?.anchor), entityId: config?.entityId ?? '', config }];
  });

  // ── Rejouer la journée ─────────────────────────────────────────────────────
  // Lampes et éléments animés, que l'historique rejoue.
  const glows = chips.flatMap(c =>
    c.entityId.startsWith('light.') && c.config?.glow !== false
      ? [{ ...c, pos: normalizePos(c.pos, false), size: c.config?.glowSize ?? 12 }]
      : []
  );
  const parts = normalizeParts(floorplan?.parts);
  /** Ouvertures de la maquette elle-même : le type de leurs familles, et leurs liaisons. */
  const openingsConfig = normalizeOpenings(floorplan?.openings);
  const replay = useReplay([...glows.map(g => g.entityId), ...parts.map(p => p.entityId), ...openingsConfig.links.map(l => l.entityId)]);
  const closeReplay = replay.close;
  /** État d'une entité à l'instant rejoué — `undefined` en direct, ou sans historique. */
  const replayed = (entityId: string) => (replay.span ? stateAt(replay.history[entityId], replay.time) : undefined);

  // Entrer en édition ou en sortir, changer de page : on referme ce qui n'avait
  // de sens qu'avant — pendant le rendu plutôt que dans un effet, qui
  // peindrait d'abord l'état périmé.
  /** Ce qu'on était en train de poser ou de dessiner : abandonné. */
  const clearDrafts = useCallback(() => {
    setAdding(null);
    setDraft(null);
    setRoomDraft(null);
    setCableDraft(null);
  }, []);

  const scope = `${isEditMode}:${currentPage?.id}`;
  const [wasScope, setWasScope] = useState(scope);
  if (wasScope !== scope) {
    setWasScope(scope);
    setSelectedId(null);
    setPanel(null);
    clearDrafts();
    setFocusId(null);
    setCompass(false);
    closeReplay();
  }

  useEffect(() => {
    if (!isEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearDrafts();
        setSelectedId(null);
        return;
      }
      // Entrée ferme la pièce qu'on dessine, à partir de trois sommets ; finit
      // le câble, à partir de deux — sauf dans un champ, où elle valide.
      if (e.key !== 'Enter' || isTypingTarget(e)) return;
      if (roomDraft && !roomDraft.naming && roomDraft.points.length >= 3) setRoomDraft({ ...roomDraft, naming: true });
      else if (cableDraft && !cableDraft.cable && cableDraft.points.length >= 2) setCableDraft(finishCable(cableDraft));
      else return;
      // La touche est prise : la fenêtre qui s'ouvre en prend le focus, et
      // l'Entrée l'aurait aussitôt validée.
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditMode, roomDraft, cableDraft, clearDrafts]);

  // Boussole, sur téléphone : proposée dès que l'appareil donne son
  // orientation. Dans l'appli Home Assistant, Android seulement, et en HTTPS.
  const isPhone = useIsMobile();
  const [compassReady, setCompassReady] = useState(false);
  useEffect(() => {
    if (!isPhone || !model || compassReady) return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setCompassReady(true);
    };
    window.addEventListener('deviceorientationabsolute', onOrientation);
    return () => window.removeEventListener('deviceorientationabsolute', onOrientation);
  }, [isPhone, model, compassReady]);

  // Échap referme la relecture, puis ramène à toute la maison — sauf s'il
  // referme d'abord la fiche d'une pastille.
  const sheetOpen = !!useMoreInfoOptional()?.state;
  const replaying = !!replay.span;
  useEffect(() => {
    if ((!focusId && !replaying) || sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (replaying) closeReplay();
      else setFocusId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, replaying, sheetOpen, closeReplay]);

  // Pièces dessinées : leurs lampes n'éclairent qu'elles.
  const rooms = normalizeRooms(floorplan?.rooms);
  /** La pièce où tombe ce point (x, z) du sol. */
  const roomAt = (x: number, z: number) => rooms.find(r => pointInPolygon(x, z, r.points));
  const cables = normalizeCables(floorplan?.cables);
  // Ce qui circule dans chaque câble — celui qu'on vient de tracer compris : on
  // voit son sens en choisissant son entité.
  const allCables = [...cables, ...(cableDraft?.cable ? [cableDraft.cable] : [])];
  // La météo voile le soleil et grise le ciel : l'entité choisie, ou la première trouvée.
  const firstWeather = useHass(s => {
    if (floorplan?.weather) return '';
    for (const id in s.entities ?? {}) if (id.startsWith('weather.')) return id;
    return '';
  });
  const weatherId = floorplan?.weather || firstWeather;
  /** Les entités de la page : pastilles, soleil, météo, portes et volets, câbles. */
  const entities = useEntities([
    ...chips.map(c => c.entityId),
    'sun.sun',
    weatherId,
    ...parts.map(p => p.entityId),
    ...openingsConfig.links.map(l => l.entityId),
    ...allCables.map(c => c.entityId),
  ]);

  // ── Lampes : halos du plan, lumières de la maquette ────────────────────────
  const sunEntity = entities['sun.sun'];
  const dimmed = isNightDimmed(sunEntity?.state, floorplan?.dimAtNight);
  // Mode mock : l'heure du soleil se règle au curseur (panneau « Maquette 3D »),
  // pour voir la maquette de nuit, à l'aube, à midi. Le soleil d'aujourd'hui, au
  // lieu que donne la configuration de HA.
  // Pendant une relecture, c'est le soleil de l'instant rejoué.
  const place = useHass(s => s.config);
  const [today] = useState(() => new Date().setHours(0, 0, 0, 0));
  const [mockHour, setMockHour] = useState(14);
  const sunAt = replay.span ? replay.time : MOCK ? today + mockHour * HOUR_MS : null;
  const computedSun = sunAt !== null && place ? sunPosition(new Date(sunAt), place.latitude, place.longitude) : null;
  const sunElevation = computedSun?.elevation ?? (sunEntity?.attributes?.elevation as number | undefined);
  const sunAzimuth = computedSun?.azimuth ?? (sunEntity?.attributes?.azimuth as number | undefined);
  const weatherState = entities[weatherId]?.state;
  const clouds = cloudiness(weatherState);
  // Pluie, neige, éclairs, courant dans les câbles : jamais en économie
  // d'énergie, ni quand les animations sont réduites.
  const animated = motionAllowed && !perfSettings.reduceAnimations;
  const falling = model && animated ? precipitation(weatherState) : null;
  // Le givre quand il gèle dehors : immobile, il reste même sans animations.
  const frost = model ? frostOf(entities[weatherId]?.attributes) : 0;
  // Derrière la maquette : le ciel de l'heure, sauf si la page garde le fond du thème.
  const sky = model && floorplan?.sky !== false ? skyColors(sunElevation, clouds) : null;

  // Rejouée, la maison n'a pas encore l'historique de ses câbles : ils se reposent.
  const cablesProp: CableProp[] = allCables.map(c => ({
    ...c,
    ...(replaying
      ? { direction: 0 as const, watts: null }
      : cableFlow(entities[c.entityId]?.state, entities[c.entityId]?.attributes, c.invert)),
  }));
  const focusRoom = rooms.find(r => r.id === focusId);

  const lamps: Lamp[] = model
    ? glows.flatMap(g => {
        if (!g.anchor) return [];
        const entity = replayed(g.entityId) ?? entities[g.entityId];
        const brightness = entity?.attributes?.brightness;
        return [
          {
            id: g.id,
            anchor: g.anchor,
            color: lightColor(entity?.state, entity?.attributes),
            brightness: typeof brightness === 'number' ? brightness / 255 : 1,
            // Même réglage que le halo du plan — un % de sa largeur — ramené à
            // la taille de la maquette.
            range: (g.size / 100) * MODEL_SIZE * 2,
            room: roomAt(g.anchor[0], g.anchor[2])?.points,
            hidden: !isEditMode && occluded.has(g.id),
          },
        ];
      })
    : [];

  // ── Portes, fenêtres, volets ───────────────────────────────────────────────
  const partsProp: PartProp[] = [
    ...parts.map(p => {
      const entity = replayed(p.entityId) ?? entities[p.entityId];
      return { ...p, open: openness(entity?.state, entity?.attributes) };
    }),
    ...(draft?.part ? [{ ...draft.part, open: DRAFT_OPENNESS }] : []),
  ];

  /** Portes, fenêtres et baies de la maquette liées à une entité — le type de leur famille décide du mouvement. */
  const openingsProp: OpeningProp[] = openingsConfig.links.flatMap(link => {
    const kind = familyKind(parseNodeName(link.node).family, openingsConfig.kinds);
    if (!kind) return [];
    const entity = replayed(link.entityId) ?? entities[link.entityId];
    return [
      {
        id: link.node,
        kind,
        ...(link.flip && { flip: true }),
        ...(link.hinge && { hinge: true }),
        open: openness(entity?.state, entity?.attributes),
      },
    ];
  });

  // ── Pièces ─────────────────────────────────────────────────────────────────
  // Température de chaque pièce : la moyenne des capteurs de température posés dedans.
  /** Pastilles de température rattachées à une pièce : en vue thermique, la pièce affiche leur valeur à leur place. */
  const thermometers = new Set<string>();
  const roomTemperatures = rooms.map(room => {
    const readings = chips.flatMap(c => {
      const entity = entities[c.entityId];
      const reading =
        c.anchor && pointInPolygon(c.anchor[0], c.anchor[2], room.points) ? temperatureOf(entity?.state, entity?.attributes) : null;
      if (reading) thermometers.add(c.id);
      return reading ? [reading] : [];
    });
    if (!readings.length) return null;
    const mean = (key: 'value' | 'celsius') => readings.reduce((sum, r) => sum + r[key], 0) / readings.length;
    return { value: mean('value'), celsius: mean('celsius') };
  });
  // Rejouée, la maison n'a que l'historique de ses lampes et de ses portes : pas de températures.
  const showThermal = thermal && !isEditMode && !replaying;
  /** Pastilles d'un détecteur de mouvement ou de présence déclenché : une lueur respire dessous. */
  const present = new Set(chips.flatMap(c => (isPresence(entities[c.entityId]?.state, entities[c.entityId]?.attributes) ? [c.id] : [])));

  /** Contour de la pièce en cours de dessin, jusqu'au pointeur tant qu'elle n'est pas fermée. */
  const roomPoints: [number, number][] = roomDraft
    ? [...roomDraft.points, ...(!roomDraft.naming && hover ? [[hover[0], hover[2]] as [number, number]] : [])]
    : [];
  const floors: FloorOverlay[] = showThermal
    ? rooms.flatMap((r, i) => {
        const temperature = roomTemperatures[i];
        return temperature ? [{ y: r.y, points: r.points, color: thermalColor(temperature.celsius), fill: 0.42, closed: true }] : [];
      })
    : isEditMode
      ? [
          ...rooms.map(r => ({ y: r.y, points: r.points, color: ROOM_COLOR, fill: 0.12, closed: true })),
          ...(roomDraft ? [{ y: roomDraft.y, points: roomPoints, color: DRAFT_COLOR, fill: 0.18, closed: roomPoints.length >= 3 }] : []),
        ]
      : [];

  /** Hors édition, les pastilles que la maquette cache s'effacent : leurs points d'accroche, à vérifier. */
  const anchors = isEditMode
    ? undefined
    : Object.fromEntries(
        widgets.flatMap(w => {
          const anchor = normalizeAnchor(w.pos?.anchor);
          return anchor ? [[w.id, anchor]] : [];
        })
      );

  /** Rectangle ambre du dessin : du premier coin au pointeur, ou avec le coin qu'on reprend. */
  const outline: [Vec3, Vec3] | null = !draft
    ? null
    : !draft.part
      ? hover && [draft.a, hover]
      : adjust && (adjust.corner === 'a' ? [adjust.point, draft.part.b] : [draft.part.a, adjust.point]);

  const setFloorplan = (patch: Partial<FloorplanConfig>) => {
    if (!currentPage) return;
    updatePage(currentPage.id, { floorplan: { image: '', ...floorplan, ...patch } });
  };

  const onPlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !planRef.current) return;
    const rect = planRef.current.getBoundingClientRect();
    setSelectedId(null);
    setAdding({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  /**
   * Hors édition, toucher une pièce y fait voler la caméra ; toucher ailleurs
   * ramène à toute la maison. La pièce du point touché ; à défaut — un meuble
   * contre le mur, le mur lui-même —, celle dont le sol est sous le doigt.
   */
  const onViewPick = (anchor: Vec3 | null, clientX: number, clientY: number) => {
    const room =
      (anchor && roomAt(anchor[0], anchor[2])) ||
      rooms.find(r => {
        const floor = three.current?.floorAt(clientX, clientY, r.y);
        return !!floor && pointInPolygon(floor[0], floor[1], r.points);
      });
    setFocusId(room?.id ?? null);
  };

  const onModelPick = (anchor: Vec3 | null, clientX: number, clientY: number) => {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect || !anchor) return;
    const at = { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
    /** Le clic tombe-t-il sur ce point de la maquette, à l'écran ? */
    const near = (point: Vec3) => {
      const p = projector.get()?.(point);
      return !!p && Math.hypot(((p.x - at.x) / 100) * rect.width, ((p.y - at.y) / 100) * rect.height) < CLOSE_PX;
    };
    setSelectedId(null);
    if (tool === 'chip') return setAdding({ ...at, anchor });
    if (tool === 'cable') {
      if (cableDraft?.cable) return;
      // Recliquer le dernier point finit le câble.
      if (cableDraft && cableDraft.points.length >= 2 && near(cableDraft.points[cableDraft.points.length - 1])) {
        return setCableDraft(finishCable(cableDraft));
      }
      return setCableDraft(d => ({ points: [...(d?.points ?? []), anchor] }));
    }
    if (tool === 'room') {
      if (roomDraft?.naming) return;
      // Recliquer le premier sommet ferme la pièce.
      if (roomDraft && roomDraft.points.length >= 3 && near([roomDraft.points[0][0], roomDraft.y, roomDraft.points[0][1]])) {
        return setRoomDraft({ ...roomDraft, naming: true });
      }
      // Le sol de la pièce : le plus bas des points cliqués — un clic sur un meuble ne le soulève pas.
      return setRoomDraft(d =>
        d
          ? { ...d, points: [...d.points, [anchor[0], anchor[2]]], y: Math.min(d.y, anchor[1]) }
          : { points: [[anchor[0], anchor[2]]], y: anchor[1] }
      );
    }
    // Deux coins : le bas côté gonds, puis le haut opposé. Un second clic trop
    // proche du premier — ou un nouveau dessin — repart de ce point.
    if (!draft || draft.part || !partFrame(draft.a, anchor)) {
      setHover(null);
      return setDraft({ a: anchor, from: at });
    }
    const handle = three.current;
    const color = handle?.colorAt(draft.a.map((v, i) => (v + anchor[i]) / 2) as Vec3);
    setDraft({
      ...draft,
      around: { left: Math.min(draft.from.x, at.x), right: Math.max(draft.from.x, at.x), y: (draft.from.y + at.y) / 2 },
      part: {
        id: newId('part'),
        kind: 'door',
        entityId: '',
        a: draft.a,
        b: anchor,
        side: handle?.facing(draft.a, anchor) ?? 1,
        ...(color && { color }),
      },
    });
  };

  const placeChip = (entityId: string) => {
    const at = adding;
    setAdding(null);
    if (!at || !entityId) return;
    const id = addWidgetByType('chip');
    if (!id) return;
    updateWidgetConfig(id, { ...DEFAULT_WIDGET_CONFIGS.chip, entityId } as WidgetConfig);
    // Rapproché de l'ajout : un seul point d'annulation pour les deux.
    updateWidget(id, { pos: { x: at.x, y: at.y, ...(at.anchor && { anchor: at.anchor }) } }, 'lg');
  };

  /** Un coin repris suit le pointeur, sur la maquette. */
  const dragCorner = (corner: 'a' | 'b') => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const point = three.current?.pick(e.clientX, e.clientY);
    if (point) setAdjust({ corner, point });
  };

  /** Coin repris, lâché : l'élément se redessine à sa nouvelle forme — le temps du glisser, seul le rectangle suivait. */
  const commitCorner = () => {
    if (adjust && draft?.part) {
      const part = { ...draft.part, [adjust.corner]: adjust.point };
      if (partFrame(part.a, part.b)) setDraft({ ...draft, part });
    }
    setAdjust(null);
  };

  /** Une pastille lâchée sur la maquette s'y raccroche là où elle tombe. */
  const reanchor = (w: GridWidget) => (next: FloorplanPos, clientX: number, clientY: number) => {
    const anchor = three.current?.pick(clientX, clientY);
    if (anchor) updateWidget(w.id, { pos: { ...w.pos, ...next, anchor } }, 'lg');
    // Lâchée dans le vide : une pastille accrochée reste où elle était, une
    // pastille libre prend sa nouvelle place à l'écran.
    else if (!w.pos?.anchor) updateWidget(w.id, { pos: { ...w.pos, ...next } }, 'lg');
  };

  const picker = (
    <ImageBackgroundPicker
      background={{ mode: 'image', imageUrl: image ?? '' } as BackgroundConfig}
      setBackground={bg => setFloorplan({ image: bg.imageUrl ?? '' })}
    />
  );

  const modelField = <ModelPicker model={model} onChange={next => setFloorplan({ model: next })} />;

  /**
   * Surface des cards sur le plan. Le verre des thèmes est réglé pour un fond
   * uni et sombre : sur un rendu ou une photo, souvent clairs, un voile blanc
   * à 10 % laisse le texte illisible. La couleur de fond du thème, presque
   * opaque, reste lisible dans les deux sens — sombre sous un texte clair,
   * claire sous un texte sombre.
   */
  const surface = {
    '--dash-bg-card': colorAlpha(tokens.bgPrimary, 80),
    '--dash-bg-card-hover': colorAlpha(tokens.bgPrimary, 90),
  } as React.CSSProperties;

  const plan = containSize(area.w, area.h, aspect);
  // Plus large que la place disponible (téléphone) : on fait défiler le plan.
  const pan = !model && !!image && plan.w > area.w + 1;
  const loaded = !!model && loadedModel === model;
  const failed = failure && failure.model === model ? failure.kind : null;

  /** L'élément dessiné, dont on peut reprendre les deux coins. */
  const drawnPart = draft?.part;

  /** Point d'un dessin en cours, en % du plan : ambre, ou bleu là où poser une pastille. */
  const dot = (at: { x: number; y: number } | null, color = 'bg-amber-400 ring-amber-400/30') =>
    at && (
      <span
        className={cn('absolute w-3 h-3 rounded-full ring-4 pointer-events-none', color)}
        style={{ left: `${at.x}%`, top: `${at.y}%`, translate: '-50% -50%' }}
      />
    );

  const items = (
    <FreeGridScope>
      {/* `pointer-events-none` : entre les éléments, le clic atteint le plan. */}
      <motion.div
        className='absolute inset-0 pointer-events-none'
        variants={motionAllowed ? staggerGridContainer : undefined}
        initial={motionAllowed ? 'hidden' : false}
        animate='visible'
      >
        <Projected projector={projector}>
          {toScreen =>
            widgets.map(w => {
              if (showThermal && thermometers.has(w.id)) return null;
              const anchor = model ? normalizeAnchor(w.pos?.anchor) : undefined;
              const projected = anchor ? toScreen(anchor) : undefined;
              // Accrochée à la maquette : rien à montrer tant qu'elle n'est pas
              // chargée, ni quand le point est derrière la caméra.
              if (projected === null) return null;
              return (
                <FloorplanItem
                  key={w.id}
                  widget={w}
                  isEditMode={isEditMode}
                  selected={selectedId === w.id}
                  onSelect={setSelectedId}
                  planRef={planRef}
                  projected={projected}
                  onCommit={model && w.type === 'chip' ? reanchor(w) : undefined}
                  // Vol vers une pièce : les pastilles des autres pièces s'estompent.
                  // Rejouée, tout s'estompe : pastilles et cards montrent le présent.
                  faded={replaying || (!!anchor && !!focusRoom && !pointInPolygon(anchor[0], anchor[2], focusRoom.points))}
                  hidden={!isEditMode && occluded.has(w.id)}
                  breathing={present.has(w.id)}
                />
              );
            })
          }
        </Projected>
      </motion.div>
    </FreeGridScope>
  );

  const addPopover = adding && (
    // Remonté à chaque point : le sélecteur ne s'ouvre seul qu'au montage.
    <div key={`${adding.x}:${adding.y}`}>
      {dot(adding, 'bg-blue-400 ring-blue-400/30')}
      <DraftPopover
        title={t('layout.floorplan.addHere')}
        onCancel={() => setAdding(null)}
        style={{ left: `clamp(8rem, ${adding.x}%, calc(100% - 8rem))`, top: `calc(${adding.y}% + 0.75rem)`, translate: '-50% 0' }}
      >
        <EntityPicker autoOpen label='' value='' onChange={placeChip} />
      </DraftPopover>
    </div>
  );

  const panelButton = (id: 'image' | 'model', Icon: typeof ImageIcon, label: string) => (
    <button
      onClick={() => setPanel(p => (p === id ? null : id))}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        panel === id ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
      )}
    >
      <Icon size={13} /> {label}
    </button>
  );

  // Ce qu'un clic fera, selon l'outil — et, en cours de dessin, ce qui reste à cliquer.
  const hint = !model
    ? 'clickToAdd'
    : tool === 'chip'
      ? 'clickToAdd3d'
      : tool === 'room'
        ? roomDraft && roomDraft.points.length >= 3
          ? 'roomHintClose'
          : 'roomHint'
        : tool === 'cable'
          ? cableDraft && cableDraft.points.length >= 2
            ? 'cableHintNext'
            : 'cableHint'
          : draft && !draft.part
            ? 'partHintNext'
            : 'partHint';

  // ── Réglages de la maquette, par onglet ────────────────────────────────────
  const modelTab = (
    <>
      <Segmented
        label={t('layout.floorplan.source')}
        value={source}
        onChange={setSource}
        options={[
          { id: 'model', icon: BoxIcon, label: t('layout.floorplan.model') },
          { id: 'image', icon: ImageIcon, label: t('layout.floorplan.image') },
        ]}
      />
      {source === 'model' ? modelField : picker}
      <div className='flex items-center gap-2'>
        <label className='flex items-center gap-1.5 text-xs text-white/60'>
          {t('layout.floorplan.north')}
          <input
            type='number'
            step={15}
            value={floorplan?.north ?? 0}
            onChange={e => setFloorplan({ north: Number(e.target.value) || 0 })}
            className='w-16 px-2 py-1 rounded-md text-xs bg-white/8 border border-white/15 text-white focus:outline-none focus:border-blue-500/60'
          />
        </label>
        <button
          onClick={() => {
            const view = three.current?.view();
            if (view) setFloorplan({ camera: view });
          }}
          disabled={!loaded}
          className='ml-auto px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-40'
        >
          {t('layout.floorplan.saveView')}
        </button>
      </div>
      <ToggleRow
        label={t('layout.floorplan.cutaway')}
        checked={floorplan?.cutaway !== false}
        onChange={on => setFloorplan({ cutaway: on })}
      />
      <ToggleRow
        label={t('layout.floorplan.idleRotate')}
        checked={!!floorplan?.idleRotate}
        onChange={on => setFloorplan({ idleRotate: on })}
      />
    </>
  );

  const ambianceTab = (
    <>
      <ToggleRow label={t('layout.floorplan.sky')} checked={floorplan?.sky !== false} onChange={on => setFloorplan({ sky: on })} />
      <ToggleRow label={t('layout.floorplan.lampGlow')} checked={!!floorplan?.lampGlow} onChange={on => setFloorplan({ lampGlow: on })} />
      <EntityPicker
        label={t('layout.floorplan.weather')}
        value={weatherId}
        domain='weather'
        onChange={id => setFloorplan({ weather: id })}
      />
      {MOCK && (
        <label className='flex items-center gap-2 text-xs text-white/60'>
          {t('layout.floorplan.mockSun')}
          <input
            type='range'
            min={0}
            max={23.75}
            step={0.25}
            value={mockHour}
            onChange={e => setMockHour(Number(e.target.value))}
            className='flex-1 min-w-0 accent-amber-400'
          />
          <span className='w-11 text-right tabular-nums text-white/80'>{formatTime(new Date(today + mockHour * HOUR_MS))}</span>
        </label>
      )}
    </>
  );

  const openingsTab = parts.length ? (
    <PartList parts={parts} onRemove={id => setFloorplan({ parts: parts.filter(p => p.id !== id) })} />
  ) : (
    <EmptyTab>{t('layout.floorplan.openingsEmpty')}</EmptyTab>
  );

  const elementsTab =
    rooms.length || cables.length ? (
      <>
        <RoomList rooms={rooms} onRemove={id => setFloorplan({ rooms: rooms.filter(r => r.id !== id) })} />
        <CableList cables={cables} onRemove={id => setFloorplan({ cables: cables.filter(c => c.id !== id) })} />
      </>
    ) : (
      <EmptyTab>{t('layout.floorplan.elementsEmpty')}</EmptyTab>
    );

  return (
    <div className='relative flex-1 min-h-0'>
      {/* La zone reste montée sans image : `useElementBox` ne la mesure qu'au
          montage, et le plan choisi ensuite n'aurait jamais eu de taille. */}
      <div ref={areaRef} className={cn('absolute inset-0 flex', pan && 'overflow-x-auto')}>
        {model ? (
          <div
            ref={planRef}
            data-floorplan-plan='3d'
            className='absolute inset-0 select-none'
            style={{
              containerType: 'inline-size',
              ...surface,
              ...(sky && { background: `linear-gradient(to bottom, ${sky.top}, ${sky.horizon})`, borderRadius: '1.25rem' }),
            }}
          >
            {sky && sky.stars > 0 && (
              <div className='absolute inset-0 rounded-[1.25rem] pointer-events-none' style={{ ...STARS, opacity: sky.stars }} />
            )}
            {failed ? (
              <p className='m-auto absolute inset-0 h-fit w-fit max-w-sm px-4 py-3 rounded-2xl gc-overlay text-sm text-white/70 text-center'>
                {t(failed === 'webgl' ? 'layout.floorplan.webglError' : 'layout.floorplan.modelError')}
              </p>
            ) : (
              <Suspense fallback={null}>
                <Floorplan3D
                  ref={three}
                  model={assetUrl(model)}
                  camera={floorplan?.camera}
                  sunElevation={sunElevation}
                  sunAzimuth={sunAzimuth}
                  north={floorplan?.north ?? 0}
                  cloudiness={clouds}
                  shadows={!perfSettings.disableShadows}
                  cutaway={floorplan?.cutaway !== false}
                  // Ni en édition, où l'on règle la vue, ni en économie d'énergie,
                  // ni quand la boussole oriente la maison.
                  idleRotate={!!floorplan?.idleRotate && motionAllowed && !isEditMode && !compass}
                  compass={compass && isPhone && !isEditMode}
                  lampGlow={!!floorplan?.lampGlow}
                  lamps={lamps}
                  parts={partsProp}
                  openings={openingsProp}
                  outline={outline}
                  floors={floors}
                  cables={cablesProp}
                  flowing={animated}
                  focus={focusRoom ?? null}
                  anchors={anchors}
                  onOcclusion={next => setOccluded(prev => (prev.size === next.size && [...next].every(id => prev.has(id)) ? prev : next))}
                  onFrame={projector.set}
                  onPick={isEditMode ? onModelPick : onViewPick}
                  onOrbit={() => setCompass(false)}
                  onHover={
                    isEditMode && ((draft && !draft.part) || (roomDraft && !roomDraft.naming) || (cableDraft && !cableDraft.cable))
                      ? setHover
                      : undefined
                  }
                  onLoad={() => setLoadedModel(model)}
                  onError={kind => setFailure({ model, kind })}
                />
              </Suspense>
            )}
            {!loaded && !failed && (
              <p className='absolute inset-0 m-auto h-fit w-fit text-sm text-white/45 pointer-events-none'>
                {t('layout.floorplan.loading')}
              </p>
            )}
            <Weather falling={falling} frost={frost} />
            {/* La puissance de chaque câble, à mi-longueur ; le câble qu'on trace,
                jusqu'au pointeur, en pixels. */}
            <Projected projector={projector}>
              {toScreen => (
                <CableOverlay
                  labels={cablesProp.map(({ id, kind, watts, points }) => ({ id, kind, watts, at: toScreen(polylineMidpoint(points)) }))}
                  draft={
                    cableDraft && !cableDraft.cable
                      ? [...cableDraft.points, ...(hover ? [hover] : [])]
                          .map(toScreen)
                          .filter(p => p !== null)
                          .map(p => ({ x: (p.x / 100) * area.w, y: (p.y / 100) * area.h }))
                      : null
                  }
                />
              )}
            </Projected>
            {items}
            {addPopover}
            <Projected projector={projector}>
              {toScreen => {
                const cableEnd = cableDraft ? toScreen(cableDraft.points[cableDraft.points.length - 1]) : null;
                const roomNameAt = roomDraft?.naming ? toScreen(roomCenter(roomDraft)) : null;
                return (
                  <>
                    {isEditMode &&
                      rooms.map(room => {
                        const at = toScreen(roomCenter(room));
                        return (
                          at && (
                            <span
                              key={room.id}
                              className='absolute px-2 py-0.5 rounded-full bg-black/55 text-[11px] text-white/85 pointer-events-none whitespace-nowrap'
                              style={{ left: `${at.x}%`, top: `${at.y}%`, translate: '-50% -50%' }}
                            >
                              {room.name}
                            </span>
                          )
                        );
                      })}
                    {showThermal &&
                      rooms.map((room, i) => {
                        const at = toScreen(roomCenter(room));
                        const temperature = roomTemperatures[i];
                        return (
                          at &&
                          temperature && (
                            <span
                              key={room.id}
                              className='absolute px-2.5 py-1 rounded-full text-sm font-semibold text-white shadow-lg pointer-events-none tabular-nums'
                              style={{
                                left: `${at.x}%`,
                                top: `${at.y}%`,
                                translate: '-50% -50%',
                                background: colorAlpha(thermalColor(temperature.celsius), 85),
                                opacity: focusRoom && focusRoom.id !== room.id ? 0.2 : 1,
                                transition: 'opacity .5s',
                              }}
                            >
                              {temperature.value.toFixed(1)}°
                            </span>
                          )
                        );
                      })}
                    {/* Le premier sommet de la pièce qu'on dessine : y recliquer la ferme. */}
                    {roomDraft && !roomDraft.naming && dot(toScreen([roomDraft.points[0][0], roomDraft.y, roomDraft.points[0][1]]))}
                    {/* La pièce tout juste fermée : on la nomme en son centre. */}
                    {roomDraft?.naming && roomNameAt && (
                      <RoomNamePopover
                        at={roomNameAt}
                        defaultName={t('layout.floorplan.roomDefault', { n: rooms.length + 1 })}
                        onAdd={name => {
                          setFloorplan({
                            rooms: [...rooms, { id: newId('room'), name, y: roomDraft.y, points: roomDraft.points }],
                          });
                          setRoomDraft(null);
                        }}
                        onCancel={() => setRoomDraft(null)}
                      />
                    )}
                    {/* Le câble tracé jusqu'au bout : on choisit son entité à son bout. */}
                    {cableDraft?.cable && cableEnd && (
                      <CablePopover
                        cable={cableDraft.cable}
                        at={cableEnd}
                        onChange={cable => setCableDraft({ ...cableDraft, cable })}
                        onAdd={() => {
                          if (cableDraft.cable) setFloorplan({ cables: [...cables, cableDraft.cable] });
                          setCableDraft(null);
                        }}
                        onCancel={() => setCableDraft(null)}
                      />
                    )}
                    {/* Le premier coin d'un élément qu'on dessine ; puis ses deux coins, qu'on
                        peut reprendre — le coin repris suit le pointeur. */}
                    {draft && !draft.part && dot(toScreen(draft.a))}
                    {drawnPart &&
                      (['a', 'b'] as const).map(corner => {
                        const at = toScreen(adjust?.corner === corner ? adjust.point : drawnPart[corner]);
                        if (!at) return null;
                        return (
                          <button
                            key={corner}
                            type='button'
                            aria-label={t('layout.floorplan.partCorner')}
                            title={t('layout.floorplan.partCorner')}
                            className='absolute z-20 w-4 h-4 rounded-full bg-amber-400 ring-4 ring-amber-400/30 cursor-move touch-none'
                            style={{ left: `${at.x}%`, top: `${at.y}%`, translate: '-50% -50%' }}
                            onPointerDown={e => {
                              e.stopPropagation();
                              e.currentTarget.setPointerCapture(e.pointerId);
                            }}
                            onPointerMove={dragCorner(corner)}
                            onPointerUp={commitCorner}
                          />
                        );
                      })}
                  </>
                );
              }}
            </Projected>
            {draft?.part && draft.around && (
              <PartPopover
                part={draft.part}
                around={draft.around}
                onChange={part => setDraft({ ...draft, part })}
                onAdd={() => {
                  if (draft.part) setFloorplan({ parts: [...parts, draft.part] });
                  setDraft(null);
                }}
                onCancel={() => setDraft(null)}
              />
            )}
            {loaded && !isEditMode && (
              <div className={cn('absolute right-3 bottom-3 z-30 flex gap-2', replay.span && 'left-3')}>
                {replay.span && (
                  <ReplayBar
                    start={replay.span.start}
                    end={replay.span.end}
                    time={replay.time}
                    running={replay.running}
                    onSeek={replay.seek}
                    onToggle={replay.toggle}
                  />
                )}
                {compassReady && isPhone && (
                  <RoundButton
                    icon={Compass}
                    label={t('layout.floorplan.compass')}
                    onClick={() => setCompass(on => !on)}
                    pressed={compass}
                  />
                )}
                {roomTemperatures.some(Boolean) && !replaying && (
                  <RoundButton
                    icon={Thermometer}
                    label={t('layout.floorplan.thermal')}
                    onClick={() => setThermal(on => !on)}
                    pressed={thermal}
                    on='text-orange-300'
                  />
                )}
                <RoundButton
                  icon={HistoryIcon}
                  label={t('layout.floorplan.replay')}
                  onClick={() => (replaying ? closeReplay() : replay.open())}
                  pressed={replaying}
                />
                <RoundButton
                  icon={RotateCcw}
                  label={t('layout.floorplan.resetView')}
                  onClick={() => {
                    setFocusId(null);
                    setCompass(false);
                    three.current?.resetView();
                  }}
                />
              </div>
            )}
            {focusRoom && (
              <motion.button
                initial={motionAllowed ? { opacity: 0, x: -8 } : false}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setFocusId(null)}
                title={t('layout.floorplan.focusBack')}
                className='absolute left-3 top-3 z-30 flex items-center gap-1 pl-2 pr-3.5 py-2 rounded-xl gc-overlay text-sm font-medium text-white/85 hover:text-white transition-colors'
              >
                <ChevronLeft size={16} />
                {focusRoom.name}
              </motion.button>
            )}
          </div>
        ) : !image ? (
          <div className='m-auto w-full max-w-sm flex flex-col items-center gap-3 p-6 rounded-3xl gc-overlay text-center'>
            <MapIcon size={28} className='text-white/40' />
            <h2 className='text-white/85 font-semibold'>{t('layout.floorplan.emptyTitle')}</h2>
            <p className='text-white/45 text-sm'>{isEditMode ? t('layout.floorplan.imageHint') : t('layout.floorplan.emptyView')}</p>
            {isEditMode && (
              <div className='w-full flex flex-col gap-3 text-left'>
                {picker}
                <p className='text-white/45 text-xs text-center'>{t('layout.floorplan.orModel')}</p>
                {modelField}
              </div>
            )}
          </div>
        ) : (
          <div
            ref={planRef}
            data-floorplan-plan
            onClick={onPlanClick}
            className={cn('relative m-auto shrink-0 select-none', isEditMode && 'cursor-crosshair')}
            // `inline-size` : les pastilles dimensionnent leur texte en `cqi`,
            // c'est-à-dire en % de la largeur du plan.
            style={{ width: plan.w, height: plan.h, containerType: 'inline-size', ...surface }}
          >
            <img
              src={assetUrl(image)}
              alt=''
              draggable={false}
              onLoad={e => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                if (w && h) setAspect(w / h);
              }}
              className='absolute inset-0 w-full h-full object-contain'
              style={{ filter: dimmed ? 'brightness(0.5) saturate(0.85)' : undefined, transition: 'filter 1.5s ease' }}
            />

            {/* Un seul calque en `screen` plutôt qu'un par halo : les halos
                s'additionnent entre eux, puis éclaircissent le plan en une fois. */}
            <div className='absolute inset-0 pointer-events-none' style={{ mixBlendMode: 'screen' }}>
              {glows.map(g => {
                const glow = lightGlow(entities[g.entityId]?.state, entities[g.entityId]?.attributes);
                if (!glow) return null;
                const [r, gr, b] = glow.color;
                return (
                  <div
                    key={g.id}
                    className='absolute rounded-full'
                    style={{
                      left: `${g.pos.x}%`,
                      top: `${g.pos.y}%`,
                      width: `${g.size}%`,
                      aspectRatio: '1',
                      translate: '-50% -50%',
                      background: `radial-gradient(closest-side, rgba(${r},${gr},${b},${glow.opacity}), rgba(${r},${gr},${b},0))`,
                    }}
                  />
                );
              })}
            </div>

            {items}
            {addPopover}
          </div>
        )}
      </div>

      {isEditMode && model && (
        <SettingsPanel
          tab={panel === 'image' ? null : panel}
          onTab={setPanel}
          tool={tool}
          onTool={next => {
            setTool(next);
            clearDrafts();
          }}
          hint={t(`layout.floorplan.${hint}`)}
          tabs={[
            { id: 'model', icon: BoxIcon, label: t('layout.floorplan.tabModel'), content: modelTab },
            { id: 'ambiance', icon: Sun, label: t('layout.floorplan.tabAmbiance'), content: ambianceTab },
            { id: 'openings', icon: DoorOpen, label: t('layout.floorplan.tabOpenings'), badge: parts.length, content: openingsTab },
            {
              id: 'elements',
              icon: Layers,
              label: t('layout.floorplan.tabElements'),
              badge: rooms.length + cables.length,
              content: elementsTab,
            },
          ]}
        />
      )}
      {isEditMode && !model && image && (
        <div className='absolute left-2 top-2 z-30 w-72 max-w-[calc(100%-1rem)] flex flex-col gap-2 p-2.5 rounded-2xl gc-overlay'>
          <div className='flex flex-wrap items-center gap-2'>
            {panelButton('image', ImageIcon, t('layout.floorplan.image'))}
            {panelButton('model', BoxIcon, t('layout.floorplan.model'))}
            <label className='flex items-center gap-1.5 text-xs text-white/60 cursor-pointer select-none'>
              <input
                type='checkbox'
                checked={floorplan?.dimAtNight !== false}
                onChange={e => setFloorplan({ dimAtNight: e.target.checked })}
                className='accent-blue-500'
              />
              {t('layout.floorplan.dimAtNight')}
            </label>
          </div>
          {panel === 'image' && picker}
          {panel === 'model' && modelField}
          <p className='text-[11px] text-white/40 px-0.5'>{t(`layout.floorplan.${hint}`)}</p>
        </div>
      )}
    </div>
  );
}

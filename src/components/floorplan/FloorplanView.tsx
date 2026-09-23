import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import {
  Box as BoxIcon,
  ChevronLeft,
  Compass,
  DoorOpen,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  SquareDashed,
  Thermometer,
  X,
} from 'lucide-react';
import { usePages, type FloorplanConfig } from '@/context/PageContext';
import { useDashboardLayout, useEditMode, type FloorplanPos, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { FreeGridScope } from '@/components/layout/DashboardGrid';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { ImageBackgroundPicker } from '@/components/layout/ThemeControlsModal/ImageBackgroundPicker';
import type { BackgroundConfig } from '@/config/themes';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { useEntities } from '@/hooks/useEntities';
import { useElementBox } from '@/hooks/useWidgetSize';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { staggerGridContainer } from '@/lib/motion-variants';
import { assetUrl } from '@/lib/api-base';
import { colorAlpha } from '@/lib/color-value';
import { useTheme } from '@/context/ThemeContext';
import {
  cloudiness,
  containSize,
  isNightDimmed,
  isPresence,
  lightColor,
  lightGlow,
  MODEL_SIZE,
  normalizeAnchor,
  normalizeParts,
  normalizeRooms,
  normalizePos,
  openness,
  partFrame,
  pointInPolygon,
  polygonCentroid,
  precipitation,
  skyColors,
  temperatureOf,
  thermalColor,
  type FloorplanPart,
  type Vec3,
} from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { ChipCardConfig, WidgetConfig } from '@/types/widget-configs';
import type { FloorOverlay, Floorplan3DHandle, Lamp, PartProp } from './Floorplan3D';
import { FloorplanItem } from './FloorplanItem';
import { PartList, PartPopover } from './FloorplanParts';
import { RoomList, RoomNamePopover } from './FloorplanRooms';
import { ModelPicker } from './ModelPicker';

// three.js ne se télécharge que pour une page qui a une maquette.
const Floorplan3D = lazy(() => import('./Floorplan3D'));

/** Proportions supposées tant que l'image n'est pas chargée. */
const DEFAULT_ASPECT = 16 / 9;

type Projection = { x: number; y: number } | null;

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

/** Pièces : leur contour en édition, et celui qu'on dessine. */
const ROOM_COLOR = '#60a5fa';
const DRAW_COLOR = '#fbbf24';
/** En deçà (px) du premier sommet, un clic ferme la pièce qu'on dessine. */
const CLOSE_PX = 14;
/** Clés, parmi les projections : premier sommet et centre de la pièce en cours de dessin. */
const ROOM_FIRST = '__room-first';
const ROOM_CENTER = '__room-center';
const roomKey = (id: string) => `room:${id}`;

/** Clés, parmi les projections, du premier coin d'un élément en cours de dessin, puis de ses deux coins. */
const DRAFT_MARK = '__draft';
const DRAFT_CORNERS = { a: '__draft-a', b: '__draft-b' } as const;

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
  const motionAllowed = useLowPowerMotion();
  const { tokens, perfSettings } = useTheme();

  const areaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const three = useRef<Floorplan3DHandle>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useElementBox(areaRef, (w, h) => setArea({ w, h }));
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Point cliqué, en % du plan — et de la maquette, s'il y en a une — où poser la prochaine pastille. */
  const [adding, setAdding] = useState<{ x: number; y: number; anchor?: Vec3 } | null>(null);
  const [panel, setPanel] = useState<'image' | 'model' | null>(null);
  /** Maquette : ce que pose un clic — une pastille, ou un coin de porte, de fenêtre, de volet. */
  const [tool, setTool] = useState<'chip' | 'part' | 'room'>('chip');
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
  // position), en échec, et projection de chaque point d'accroche à l'écran.
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ model: string; kind: 'webgl' | 'model' } | null>(null);
  const [projections, setProjections] = useState<Record<string, Projection>>({});

  const floorplan = currentPage?.floorplan;
  const image = floorplan?.image;
  const model = floorplan?.model;
  const widgets = layout.widgets.lg;

  // Entrer en édition ou en sortir, changer de page : on referme ce qui n'avait
  // de sens qu'avant — pendant le rendu plutôt que dans un effet, qui
  // peindrait d'abord l'état périmé.
  const scope = `${isEditMode}:${currentPage?.id}`;
  const [wasScope, setWasScope] = useState(scope);
  if (wasScope !== scope) {
    setWasScope(scope);
    setSelectedId(null);
    setAdding(null);
    setPanel(null);
    setDraft(null);
    setRoomDraft(null);
    setFocusId(null);
    setCompass(false);
  }

  useEffect(() => {
    if (!isEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      // Entrée ferme la pièce qu'on dessine, à partir de trois sommets.
      if (e.key === 'Enter') setRoomDraft(d => (d && !d.naming && d.points.length >= 3 ? { ...d, naming: true } : d));
      if (e.key !== 'Escape') return;
      setAdding(null);
      setSelectedId(null);
      setDraft(null);
      setRoomDraft(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditMode]);

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

  // Échap ramène à toute la maison — sauf s'il referme d'abord la fiche d'une pastille.
  const sheetOpen = !!useMoreInfoOptional()?.state;
  useEffect(() => {
    if (!focusId || sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, sheetOpen]);

  // ── Lampes : halos du plan, lumières de la maquette ────────────────────────
  const glows = widgets.flatMap(w => {
    if (w.type !== 'chip') return [];
    const config = getWidgetConfig<ChipCardConfig>(w.id);
    const entityId = config?.entityId ?? '';
    if (!entityId.startsWith('light.') || config?.glow === false) return [];
    return [{ id: w.id, entityId, pos: normalizePos(w.pos, false), anchor: normalizeAnchor(w.pos?.anchor), size: config?.glowSize ?? 12 }];
  });
  const lights = useEntities(glows.map(g => g.entityId));
  const sunEntity = useEntities(['sun.sun'])['sun.sun'];
  const dimmed = isNightDimmed(sunEntity?.state, floorplan?.dimAtNight);
  const sunElevation = sunEntity?.attributes?.elevation as number | undefined;
  // La météo voile le soleil et grise le ciel : l'entité choisie, ou la première trouvée.
  const firstWeather = useHass(s => Object.keys(s.entities ?? {}).find(id => id.startsWith('weather.')));
  const weatherId = floorplan?.weather || firstWeather || '';
  const weatherState = useEntities([weatherId])[weatherId]?.state;
  const clouds = cloudiness(weatherState);
  // Pluie, neige, éclairs : animés en CSS, jamais en économie d'énergie.
  const falling = model && motionAllowed ? precipitation(weatherState) : null;
  // Derrière la maquette : le ciel de l'heure, sauf si la page garde le fond du thème.
  const sky = model && floorplan?.sky !== false ? skyColors(sunElevation, clouds) : null;

  // Pièces dessinées : leurs lampes n'éclairent qu'elles.
  const rooms = normalizeRooms(floorplan?.rooms);
  const focusRoom = rooms.find(r => r.id === focusId);

  const lamps: Lamp[] = model
    ? glows.flatMap(g => {
        if (!g.anchor) return [];
        const entity = lights[g.entityId];
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
            room: rooms.find(r => pointInPolygon(g.anchor![0], g.anchor![2], r.points))?.points,
          },
        ];
      })
    : [];

  // ── Portes, fenêtres, volets ───────────────────────────────────────────────
  const parts = normalizeParts(floorplan?.parts);
  const partEntities = useEntities(parts.map(p => p.entityId));
  const partsProp: PartProp[] = [
    ...parts.map(p => ({ ...p, open: openness(partEntities[p.entityId]?.state, partEntities[p.entityId]?.attributes) })),
    ...(draft?.part ? [{ ...draft.part, open: DRAFT_OPENNESS }] : []),
  ];

  // ── Pièces ─────────────────────────────────────────────────────────────────
  // Température de chaque pièce : la moyenne des capteurs de température posés dedans.
  const chipEntities = useEntities(
    widgets.flatMap(w => (w.type === 'chip' ? [getWidgetConfig<ChipCardConfig>(w.id)?.entityId ?? ''] : []))
  );
  /** Pastilles de température rattachées à une pièce : en vue thermique, la pièce affiche leur valeur à leur place. */
  const thermometers = new Set<string>();
  const roomTemperatures = rooms.map(room => {
    const readings = widgets.flatMap(w => {
      const anchor = normalizeAnchor(w.pos?.anchor);
      const entity = w.type === 'chip' ? chipEntities[getWidgetConfig<ChipCardConfig>(w.id)?.entityId ?? ''] : undefined;
      const reading = anchor && pointInPolygon(anchor[0], anchor[2], room.points) ? temperatureOf(entity?.state, entity?.attributes) : null;
      if (reading) thermometers.add(w.id);
      return reading ? [reading] : [];
    });
    if (!readings.length) return null;
    const mean = (key: 'value' | 'celsius') => readings.reduce((sum, r) => sum + r[key], 0) / readings.length;
    return { value: mean('value'), celsius: mean('celsius') };
  });
  const showThermal = thermal && !isEditMode;
  /** Pastilles d'un détecteur de mouvement ou de présence déclenché : une lueur respire dessous. */
  const present = new Set(
    widgets.flatMap(w => {
      const entity = w.type === 'chip' ? chipEntities[getWidgetConfig<ChipCardConfig>(w.id)?.entityId ?? ''] : undefined;
      return isPresence(entity?.state, entity?.attributes) ? [w.id] : [];
    })
  );

  /** Contour de la pièce en cours de dessin, jusqu'au pointeur tant qu'elle n'est pas fermée. */
  const roomPoints: [number, number][] = roomDraft
    ? [...roomDraft.points, ...(!roomDraft.naming && hover ? [[hover[0], hover[2]] as [number, number]] : [])]
    : [];
  const floors: FloorOverlay[] = showThermal
    ? rooms.flatMap((r, i) => {
        const temperature = roomTemperatures[i];
        return temperature
          ? [{ id: r.id, y: r.y, points: r.points, color: thermalColor(temperature.celsius), fill: 0.42, closed: true }]
          : [];
      })
    : isEditMode
      ? [
          ...rooms.map(r => ({ id: r.id, y: r.y, points: r.points, color: ROOM_COLOR, fill: 0.12, closed: true })),
          ...(roomDraft
            ? [{ id: '__room', y: roomDraft.y, points: roomPoints, color: DRAW_COLOR, fill: 0.18, closed: roomPoints.length >= 3 }]
            : []),
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

  /** Après chaque image de la maquette : où tombe chaque point d'accroche. */
  const onFrame = () => {
    const handle = three.current;
    if (!handle) return;
    const next: Record<string, Projection> = {};
    for (const w of widgets) {
      const anchor = normalizeAnchor(w.pos?.anchor);
      if (anchor) next[w.id] = handle.project(anchor);
    }
    // Le premier coin d'un élément en cours de dessin, marqué d'un point ; puis
    // ses deux coins, qu'on peut reprendre — le coin repris suit le pointeur.
    if (draft && !draft.part) next[DRAFT_MARK] = handle.project(draft.a);
    if (draft?.part) {
      for (const corner of ['a', 'b'] as const) {
        next[DRAFT_CORNERS[corner]] = handle.project(adjust?.corner === corner ? adjust.point : draft.part[corner]);
      }
    }
    // Pièces : leur nom au centre, en édition ; le premier sommet de celle
    // qu'on dessine — y recliquer la ferme — puis son centre, pour la nommer.
    if (isEditMode || showThermal) {
      for (const room of rooms) {
        const [x, z] = polygonCentroid(room.points);
        next[roomKey(room.id)] = handle.project([x, room.y, z]);
      }
    }
    if (roomDraft) {
      const [x0, z0] = roomDraft.points[0];
      next[ROOM_FIRST] = handle.project([x0, roomDraft.y, z0]);
      if (roomDraft.naming) {
        const [x, z] = polygonCentroid(roomDraft.points);
        next[ROOM_CENTER] = handle.project([x, roomDraft.y, z]);
      }
    }
    setProjections(next);
  };

  /** Rectangle ambre du dessin : du premier coin au pointeur, ou avec le coin qu'on reprend. */
  const outline: [Vec3, Vec3] | null = !draft
    ? null
    : !draft.part
      ? hover && [draft.a, hover]
      : adjust && (adjust.corner === 'a' ? [adjust.point, draft.part.b] : [draft.part.a, adjust.point]);

  // Une pastille accrochée ou déplacée sans que la caméra bouge : redessiner,
  // pour que sa nouvelle position soit projetée.
  const anchorsKey = model
    ? JSON.stringify([
        widgets.map(w => w.pos?.anchor ?? null),
        draft?.a ?? null,
        draft?.part?.a ?? null,
        draft?.part?.b ?? null,
        (isEditMode || showThermal) && rooms.map(r => r.id),
        roomDraft,
      ])
    : '';
  useEffect(() => {
    three.current?.invalidate();
  }, [anchorsKey]);

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
      (anchor && rooms.find(r => pointInPolygon(anchor[0], anchor[2], r.points))) ||
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
    setSelectedId(null);
    if (tool === 'chip') return setAdding({ ...at, anchor });
    if (tool === 'room') {
      if (roomDraft?.naming) return;
      // Recliquer le premier sommet ferme la pièce.
      const first = projections[ROOM_FIRST];
      if (roomDraft && roomDraft.points.length >= 3 && first) {
        const distance = Math.hypot(((first.x - at.x) / 100) * rect.width, ((first.y - at.y) / 100) * rect.height);
        if (distance < CLOSE_PX) return setRoomDraft({ ...roomDraft, naming: true });
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
        id: `part-${Date.now().toString(36)}`,
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

  const items = (
    <FreeGridScope>
      {/* `pointer-events-none` : entre les éléments, le clic atteint le plan. */}
      <motion.div
        className='absolute inset-0 pointer-events-none'
        variants={motionAllowed ? staggerGridContainer : undefined}
        initial={motionAllowed ? 'hidden' : false}
        animate='visible'
      >
        {widgets.map(w => {
          if (showThermal && thermometers.has(w.id)) return null;
          const anchor = model ? normalizeAnchor(w.pos?.anchor) : undefined;
          const projected = anchor ? projections[w.id] : undefined;
          // Accrochée à la maquette : rien à montrer tant qu'elle n'est pas
          // chargée, ni quand le point est derrière la caméra.
          if (anchor && !projected) return null;
          return (
            <FloorplanItem
              key={w.id}
              widget={w}
              isEditMode={isEditMode}
              selected={selectedId === w.id}
              onSelect={setSelectedId}
              planRef={planRef}
              projected={projected ?? undefined}
              onCommit={model && w.type === 'chip' ? reanchor(w) : undefined}
              // Vol vers une pièce : les pastilles des autres pièces s'estompent.
              faded={!!anchor && !!focusRoom && !pointInPolygon(anchor[0], anchor[2], focusRoom.points)}
              hidden={!isEditMode && occluded.has(w.id)}
              breathing={present.has(w.id)}
            />
          );
        })}
      </motion.div>
    </FreeGridScope>
  );

  const addPopover = adding && (
    // Remonté à chaque point : le sélecteur ne s'ouvre seul qu'au montage.
    <div key={`${adding.x}:${adding.y}`}>
      <span
        className='absolute w-3 h-3 rounded-full bg-blue-400 ring-4 ring-blue-400/30 pointer-events-none'
        style={{ left: `${adding.x}%`, top: `${adding.y}%`, translate: '-50% -50%' }}
      />
      <div
        onClick={e => e.stopPropagation()}
        className='absolute z-30 w-64 mt-3 p-2 rounded-xl gc-overlay cursor-default'
        style={{ left: `clamp(8rem, ${adding.x}%, calc(100% - 8rem))`, top: `${adding.y}%`, translate: '-50% 0' }}
      >
        <div className='flex items-center justify-between mb-1.5 px-1'>
          <span className='text-[11px] text-white/50'>{t('layout.floorplan.addHere')}</span>
          <button onClick={() => setAdding(null)} aria-label={t('common.cancel')} className='p-0.5 rounded text-white/40 hover:text-white'>
            <X size={12} />
          </button>
        </div>
        <EntityPicker autoOpen label='' value='' onChange={placeChip} />
      </div>
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

  const toolButton = (id: 'chip' | 'part' | 'room', Icon: typeof MapPin, label: string) => (
    <button
      onClick={() => {
        setTool(id);
        setDraft(null);
        setRoomDraft(null);
        setAdding(null);
      }}
      aria-pressed={tool === id}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
        tool === id ? 'bg-blue-500/20 text-blue-300' : 'text-white/45 hover:text-white/70'
      )}
    >
      <Icon size={12} /> {label}
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
        : draft && !draft.part
          ? 'partHintNext'
          : 'partHint';

  const checkbox = (label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <label className='flex items-center gap-1.5 text-xs text-white/60 cursor-pointer select-none'>
      <input type='checkbox' checked={checked} onChange={e => onChange(e.target.checked)} className='accent-blue-500' />
      {label}
    </label>
  );

  return (
    <div className='relative flex-1 min-h-0'>
      {/* La zone reste montée sans image : `useElementBox` ne la mesure qu'au
          montage, et le plan choisi ensuite n'aurait jamais eu de taille. */}
      <div ref={areaRef} className={cn('absolute inset-0 flex', pan && 'overflow-x-auto')}>
        {model ? (
          <div
            ref={planRef}
            data-floorplan-plan
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
                  sunAzimuth={sunEntity?.attributes?.azimuth as number | undefined}
                  north={floorplan?.north ?? 0}
                  cloudiness={clouds}
                  shadows={!perfSettings.disableShadows}
                  cutaway={floorplan?.cutaway !== false}
                  // Ni en édition, où l'on règle la vue, ni en économie d'énergie,
                  // ni quand la boussole oriente la maison.
                  idleRotate={!!floorplan?.idleRotate && motionAllowed && !isEditMode && !compass}
                  compass={compass && isPhone && !isEditMode}
                  lamps={lamps}
                  parts={partsProp}
                  outline={outline}
                  floors={floors}
                  focus={focusRoom ?? null}
                  anchors={anchors}
                  onOcclusion={setOccluded}
                  onFrame={onFrame}
                  onPick={isEditMode ? onModelPick : onViewPick}
                  onOrbit={() => setCompass(false)}
                  onHover={isEditMode && ((draft && !draft.part) || (roomDraft && !roomDraft.naming)) ? setHover : undefined}
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
            {falling && falling.rain > 0 && <div className='fp-rain' style={{ opacity: falling.rain }} />}
            {falling && falling.snow > 0 && <div className='fp-snow' style={{ opacity: falling.snow }} />}
            {falling?.lightning && <div className='fp-lightning' />}
            {items}
            {addPopover}
            {isEditMode &&
              rooms.map(room => {
                const at = projections[roomKey(room.id)];
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
                const at = projections[roomKey(room.id)];
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
            {roomDraft && !roomDraft.naming && projections[ROOM_FIRST] && (
              <span
                className='absolute w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/30 pointer-events-none'
                style={{ left: `${projections[ROOM_FIRST].x}%`, top: `${projections[ROOM_FIRST].y}%`, translate: '-50% -50%' }}
              />
            )}
            {roomDraft?.naming && projections[ROOM_CENTER] && (
              <RoomNamePopover
                at={projections[ROOM_CENTER]}
                defaultName={t('layout.floorplan.roomDefault', { n: rooms.length + 1 })}
                onAdd={name => {
                  setFloorplan({
                    rooms: [...rooms, { id: `room-${Date.now().toString(36)}`, name, y: roomDraft.y, points: roomDraft.points }],
                  });
                  setRoomDraft(null);
                }}
                onCancel={() => setRoomDraft(null)}
              />
            )}
            {draft && !draft.part && projections[DRAFT_MARK] && (
              <span
                className='absolute w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/30 pointer-events-none'
                style={{ left: `${projections[DRAFT_MARK].x}%`, top: `${projections[DRAFT_MARK].y}%`, translate: '-50% -50%' }}
              />
            )}
            {draft?.part &&
              (['a', 'b'] as const).map(corner => {
                const at = projections[DRAFT_CORNERS[corner]];
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
              <div className='absolute right-3 bottom-3 z-30 flex gap-2'>
                {compassReady && isPhone && (
                  <button
                    onClick={() => setCompass(on => !on)}
                    aria-pressed={compass}
                    title={t('layout.floorplan.compass')}
                    aria-label={t('layout.floorplan.compass')}
                    className={cn(
                      'p-2.5 rounded-xl gc-overlay transition-colors',
                      compass ? 'text-sky-300' : 'text-white/60 hover:text-white'
                    )}
                  >
                    <Compass size={16} />
                  </button>
                )}
                {roomTemperatures.some(Boolean) && (
                  <button
                    onClick={() => setThermal(on => !on)}
                    aria-pressed={thermal}
                    title={t('layout.floorplan.thermal')}
                    aria-label={t('layout.floorplan.thermal')}
                    className={cn(
                      'p-2.5 rounded-xl gc-overlay transition-colors',
                      thermal ? 'text-orange-300' : 'text-white/60 hover:text-white'
                    )}
                  >
                    <Thermometer size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setFocusId(null);
                    setCompass(false);
                    three.current?.resetView();
                  }}
                  title={t('layout.floorplan.resetView')}
                  aria-label={t('layout.floorplan.resetView')}
                  className='p-2.5 rounded-xl gc-overlay text-white/60 hover:text-white transition-colors'
                >
                  <RotateCcw size={16} />
                </button>
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
                const glow = lightGlow(lights[g.entityId]?.state, lights[g.entityId]?.attributes);
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

      {isEditMode && (image || model) && (
        <div className='absolute left-2 top-2 z-30 w-72 max-w-[calc(100%-1rem)] flex flex-col gap-2 p-2.5 rounded-2xl gc-overlay'>
          <div className='flex flex-wrap items-center gap-2'>
            {panelButton('image', ImageIcon, t('layout.floorplan.image'))}
            {panelButton('model', BoxIcon, t('layout.floorplan.model'))}
            {!model &&
              checkbox(t('layout.floorplan.dimAtNight'), floorplan?.dimAtNight !== false, checked => setFloorplan({ dimAtNight: checked }))}
          </div>
          {panel === 'image' && picker}
          {panel === 'model' && (
            <div className='flex flex-col gap-2'>
              {modelField}
              {model && (
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
              )}
              {model && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
                  {checkbox(t('layout.floorplan.cutaway'), floorplan?.cutaway !== false, checked => setFloorplan({ cutaway: checked }))}
                  {checkbox(t('layout.floorplan.idleRotate'), !!floorplan?.idleRotate, checked => setFloorplan({ idleRotate: checked }))}
                  {checkbox(t('layout.floorplan.sky'), floorplan?.sky !== false, checked => setFloorplan({ sky: checked }))}
                </div>
              )}
              {model && (
                <EntityPicker
                  label={t('layout.floorplan.weather')}
                  value={weatherId}
                  domain='weather'
                  onChange={id => setFloorplan({ weather: id })}
                />
              )}
              {model && <RoomList rooms={rooms} onRemove={id => setFloorplan({ rooms: rooms.filter(r => r.id !== id) })} />}
              {model && <PartList parts={parts} onRemove={id => setFloorplan({ parts: parts.filter(p => p.id !== id) })} />}
            </div>
          )}
          {model && (
            <div
              role='group'
              aria-label={t('layout.floorplan.tool')}
              className='flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 w-fit'
            >
              {toolButton('chip', MapPin, t('layout.floorplan.toolChip'))}
              {toolButton('part', DoorOpen, t('layout.floorplan.toolPart'))}
              {toolButton('room', SquareDashed, t('layout.floorplan.toolRoom'))}
            </div>
          )}
          <p className='text-[11px] text-white/40 px-0.5'>{t(`layout.floorplan.${hint}`)}</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Map as MapIcon, X } from 'lucide-react';
import { usePages, type FloorplanConfig } from '@/context/PageContext';
import { useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { FreeGridScope } from '@/components/layout/DashboardGrid';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { ImageBackgroundPicker } from '@/components/layout/ThemeControlsModal/ImageBackgroundPicker';
import type { BackgroundConfig } from '@/config/themes';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { useEntities } from '@/hooks/useEntities';
import { useElementBox } from '@/hooks/useWidgetSize';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { staggerGridContainer } from '@/lib/motion-variants';
import { assetUrl } from '@/lib/api-base';
import { colorAlpha } from '@/lib/color-value';
import { useTheme } from '@/context/ThemeContext';
import { containSize, isNightDimmed, lightGlow, normalizePos } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { ChipCardConfig, WidgetConfig } from '@/types/widget-configs';
import { FloorplanItem } from './FloorplanItem';

/** Proportions supposées tant que l'image n'est pas chargée. */
const DEFAULT_ASPECT = 16 / 9;

/**
 * Page `floorplan` : une image de la maison, et les widgets posés dessus.
 *
 * Le plan occupe la place restante de l'écran, image entière (`contain`). Les
 * éléments y sont placés en % : ils restent sur la bonne pièce quelle que soit
 * la taille de l'écran. Couches, de bas en haut : image, halos, éléments.
 */
export function FloorplanView() {
  const { t } = useI18n();
  const { currentPage, updatePage } = usePages();
  const { layout, addWidgetByType, updateWidget } = useDashboardLayout();
  const { isEditMode } = useEditMode();
  const { getWidgetConfig, updateWidgetConfig } = useWidgetConfig();
  const motionAllowed = useLowPowerMotion();
  const { tokens } = useTheme();

  const areaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useElementBox(areaRef, (w, h) => setArea({ w, h }));
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Point cliqué sur le plan, en %, où poser la prochaine pastille. */
  const [adding, setAdding] = useState<{ x: number; y: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const floorplan = currentPage?.floorplan;
  const image = floorplan?.image;
  const widgets = layout.widgets.lg;

  // Quitter l'édition referme ce qui n'a de sens qu'en édition — pendant le
  // rendu plutôt que dans un effet, qui peindrait d'abord l'état périmé.
  const [wasEditing, setWasEditing] = useState(isEditMode);
  if (wasEditing !== isEditMode) {
    setWasEditing(isEditMode);
    setSelectedId(null);
    setAdding(null);
    setPanelOpen(false);
  }

  useEffect(() => {
    if (!isEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAdding(null);
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditMode]);

  // ── Halos et nuit ──────────────────────────────────────────────────────────
  const glows = widgets.flatMap(w => {
    if (w.type !== 'chip') return [];
    const config = getWidgetConfig<ChipCardConfig>(w.id);
    const entityId = config?.entityId ?? '';
    if (!entityId.startsWith('light.') || config?.glow === false) return [];
    return [{ id: w.id, entityId, pos: normalizePos(w.pos, false), size: config?.glowSize ?? 12 }];
  });
  const lights = useEntities(glows.map(g => g.entityId));
  const sun = useEntities(['sun.sun'])['sun.sun']?.state;
  const dimmed = isNightDimmed(sun, floorplan?.dimAtNight);

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

  const placeChip = (entityId: string) => {
    const at = adding;
    setAdding(null);
    if (!at || !entityId) return;
    const id = addWidgetByType('chip');
    if (!id) return;
    updateWidgetConfig(id, { ...DEFAULT_WIDGET_CONFIGS.chip, entityId } as WidgetConfig);
    // Rapproché de l'ajout : un seul point d'annulation pour les deux.
    updateWidget(id, { pos: at }, 'lg');
  };

  const picker = (
    <ImageBackgroundPicker
      background={{ mode: 'image', imageUrl: image ?? '' } as BackgroundConfig}
      setBackground={bg => setFloorplan({ image: bg.imageUrl ?? '' })}
    />
  );

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
  const pan = !!image && plan.w > area.w + 1;

  return (
    <div className='relative flex-1 min-h-0'>
      {/* La zone reste montée sans image : `useElementBox` ne la mesure qu'au
          montage, et le plan choisi ensuite n'aurait jamais eu de taille. */}
      <div ref={areaRef} className={cn('absolute inset-0 flex', pan && 'overflow-x-auto')}>
        {!image ? (
          <div className='m-auto w-full max-w-sm flex flex-col items-center gap-3 p-6 rounded-3xl gc-overlay text-center'>
            <MapIcon size={28} className='text-white/40' />
            <h2 className='text-white/85 font-semibold'>{t('layout.floorplan.emptyTitle')}</h2>
            <p className='text-white/45 text-sm'>{isEditMode ? t('layout.floorplan.imageHint') : t('layout.floorplan.emptyView')}</p>
            {isEditMode && <div className='w-full text-left'>{picker}</div>}
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

            <FreeGridScope>
              {/* `pointer-events-none` : entre les éléments, le clic atteint le plan. */}
              <motion.div
                className='absolute inset-0 pointer-events-none'
                variants={motionAllowed ? staggerGridContainer : undefined}
                initial={motionAllowed ? 'hidden' : false}
                animate='visible'
              >
                {widgets.map(w => (
                  <FloorplanItem
                    key={w.id}
                    widget={w}
                    isEditMode={isEditMode}
                    selected={selectedId === w.id}
                    onSelect={setSelectedId}
                    planRef={planRef}
                  />
                ))}
              </motion.div>
            </FreeGridScope>

            {adding && (
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
                    <button
                      onClick={() => setAdding(null)}
                      aria-label={t('common.cancel')}
                      className='p-0.5 rounded text-white/40 hover:text-white'
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <EntityPicker autoOpen label='' value='' onChange={placeChip} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditMode && image && (
        <div className='absolute left-2 top-2 z-30 w-72 max-w-[calc(100%-1rem)] flex flex-col gap-2 p-2.5 rounded-2xl gc-overlay'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPanelOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                panelOpen ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
              )}
            >
              <ImageIcon size={13} /> {t('layout.floorplan.image')}
            </button>
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
          {panelOpen && picker}
          <p className='text-[11px] text-white/40 px-0.5'>{t('layout.floorplan.clickToAdd')}</p>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Lightbulb, Palette, Thermometer } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useRipple, RippleLayer } from '@/components/ui/Ripple';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { LightCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useWidgetSize } from '@/hooks/useWidgetSize';

function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Arrow inline en premier argument : le compilateur React refuse une
  // expression `function` castée, il ne peut pas en analyser les dépendances.
  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
  return debounced as unknown as T;
}

/** Convert HA color_temp (mireds) to a 0-100 slider value (warm=0, cool=100) */
function miredsToSlider(mireds: number, min: number, max: number): number {
  return Math.round(((max - mireds) / (max - min)) * 100);
}
function sliderToKelvin(pct: number, minMireds: number, maxMireds: number): number {
  // pct=0 → warmest (maxMireds), pct=100 → coolest (minMireds)
  const mireds = Math.round(maxMireds - (pct / 100) * (maxMireds - minMireds));
  return Math.round(1_000_000 / mireds);
}

/** Convert [r,g,b] 0-255 to hsl */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

type Tab = 'brightness' | 'colortemp' | 'color';

export function LightCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<LightCardConfig>(widgetId || 'light');
  const entityId = config?.entityId ?? 'light.salon';

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);

  // Local state for sliders
  const haBrightness = entity?.attributes.brightness as number | undefined;
  const haColorTemp = entity?.attributes.color_temp as number | undefined;
  const haRgb = entity?.attributes.rgb_color as [number, number, number] | undefined;
  const minMireds = (entity?.attributes.min_mireds as number | undefined) ?? 153;
  const maxMireds = (entity?.attributes.max_mireds as number | undefined) ?? 500;

  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null); // 0-100 slider
  const [localHue, setLocalHue] = useState<number | null>(null); // 0-360

  useEffect(() => {
    setLocalBrightness(null);
  }, [haBrightness]);
  useEffect(() => {
    setLocalColorTemp(null);
  }, [haColorTemp]);
  useEffect(() => {
    setLocalHue(null);
  }, [haRgb]);

  const [activeTab, setActiveTab] = useState<Tab>('brightness');

  const sendBrightness = useDebouncedCallback((pct: number) => {
    helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData: { brightness_pct: pct } });
  }, 150);

  const sendColorTemp = useDebouncedCallback((kelvin: number) => {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { color_temp_kelvin: kelvin },
    });
  }, 150);

  const sendColor = useDebouncedCallback((hue: number) => {
    helpers.callService({ domain: 'light', service: 'turn_on', target: { entity_id: entityId }, serviceData: { hs_color: [hue, 100] } });
  }, 150);

  const { ripples, trigger: triggerRipple } = useRipple();
  const playFeedback = useSoundFeedback();

  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);

  if (!entity) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={Lightbulb} text={t('widgets.light.notFound')} />
      </motion.div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const currentBrightness = localBrightness ?? (haBrightness != null ? Math.round((haBrightness / 255) * 100) : 0);
  const colorModes = entity.attributes.supported_color_modes as string[] | undefined;
  const isDimmable = colorModes ? colorModes.some(m => !['onoff'].includes(m)) : haBrightness !== undefined;
  const supportsColorTemp = colorModes?.some(m => ['color_temp', 'xy', 'hs', 'rgbw', 'rgbww'].includes(m)) ?? haColorTemp !== undefined;
  const supportsColor = colorModes?.some(m => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m)) ?? haRgb !== undefined;

  // Which controls to show based on config flags
  const showBrightness = (config?.showBrightness ?? true) && isDimmable;
  const showColorTemp = (config?.showColorTemp ?? true) && supportsColorTemp;
  const showColor = (config?.showColor ?? true) && supportsColor;

  const hasTabs = (showBrightness ? 1 : 0) + (showColorTemp ? 1 : 0) + (showColor ? 1 : 0) > 1;

  const colorTempSlider = localColorTemp ?? (haColorTemp != null ? miredsToSlider(haColorTemp, minMireds, maxMireds) : 50);
  const currentHue = localHue ?? (haRgb != null ? rgbToHsl(...haRgb)[0] : 0);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const pct = parseInt(e.target.value, 10);
    setLocalBrightness(pct);
    sendBrightness(pct);
  };

  const handleColorTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const pct = parseInt(e.target.value, 10);
    setLocalColorTemp(pct);
    sendColorTemp(sliderToKelvin(pct, minMireds, maxMireds));
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const h = parseInt(e.target.value, 10);
    setLocalHue(h);
    sendColor(h);
  };

  // Accent color: use current hue if in color mode, else amber
  const accentColor = isOn ? (showColor && haRgb ? `hsl(${currentHue},80%,60%)` : '#fbbf24') : undefined;

  // Custom icon
  const iconName = config?.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  // eslint-disable-next-line react-hooks/static-components
  const CustomIcon = iconName && !isCustomIcon(iconName) ? resolveIcon(iconName) : undefined;

  const visibleTabs: Tab[] = [
    ...(showBrightness ? ['brightness' as Tab] : []),
    ...(showColorTemp ? ['colortemp' as Tab] : []),
    ...(showColor ? ['color' as Tab] : []),
  ];
  const selectedTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? 'brightness');

  /**
   * Trois paliers, un par silhouette réelle de la card :
   *
   * - `sm` — une rangée ou colonne étroite : tout tient sur une ligne
   *   horizontale, pas de halo, pas de curseur.
   * - `md` — deux rangées : bouton centré + luminosité seule, sans onglets ni
   *   halo. Le halo fait 92 px et débordait sur les onglets à cette hauteur.
   * - `lg` — trois rangées ou plus : halo, onglets, curseur, libellé.
   */
  const tier: 'sm' | 'md' | 'lg' =
    widgetSize.squat || widgetSize.w === 'xs' ? 'sm' : widgetSize.h === 'short' || widgetSize.w === 'sm' ? 'md' : 'lg';

  const iconBtnClass = tier === 'sm' ? 'w-10 h-10 rounded-xl' : tier === 'md' ? 'w-14 h-14 rounded-2xl' : 'w-16 h-16 rounded-2xl';
  const iconSize = tier === 'sm' ? 18 : tier === 'md' ? 25 : 28;
  // Le halo se cale sur la hauteur disponible : sur 3 rangées il ne reste
  // qu'une centaine de pixels au bouton une fois l'en-tête et les contrôles
  // servis, un anneau de 100 px déborderait.
  const haloSize = widgetSize.h === 'tall' ? 100 : 84;

  // Sans onglets, seule la luminosité est atteignable : rendre le curseur de
  // couleur sans son sélecteur laisserait l'utilisateur coincé dessus.
  const currentTab: Tab = tier === 'lg' ? selectedTab : showBrightness ? 'brightness' : selectedTab;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      onPointerDown={triggerRipple}
      className={cn(
        'gc rounded-3xl flex h-full relative overflow-hidden select-none',
        tier === 'sm' ? 'flex-row items-center gap-3 px-3 py-2' : 'flex-col',
        tier === 'md' && 'p-2.5',
        tier === 'lg' && 'p-3.5'
      )}
      // Surface allumée : la card entière prend la couleur de la lampe et un
      // halo. Repérer une pièce allumée d'un coup d'œil depuis l'autre bout de
      // la pièce demande un contraste de *surface*, pas seulement d'icône.
      style={
        isOn
          ? {
              background: `linear-gradient(180deg, ${accentColor ?? '#fbbf24'}26, ${accentColor ?? '#fbbf24'}12)`,
              borderColor: `${accentColor ?? '#fbbf24'}44`,
              boxShadow: `var(--dash-elev-card), 0 0 28px -8px ${accentColor ?? '#fbbf24'}66`,
            }
          : undefined
      }
    >
      <RippleLayer ripples={ripples} color={accentColor ? `${accentColor}22` : 'rgba(251,191,36,0.12)'} />

      {/* Header — masqué au palier `sm`, où nom et état passent à côté du
          bouton plutôt qu'au-dessus : sur une rangée rien ne s'empile. */}
      <div className={cn('flex items-center justify-between mb-1 shrink-0', tier === 'sm' && 'hidden')}>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <motion.span
          key={isOn ? 'on' : 'off'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={cn(
            'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ml-2',
            isOn ? 'text-amber-300 border-amber-400/20' : 'bg-white/5 text-white/25 border-white/8'
          )}
          style={
            isOn
              ? {
                  background: accentColor ? `${accentColor}18` : 'rgba(251,191,36,0.14)',
                  borderColor: accentColor ? `${accentColor}35` : 'rgba(251,191,36,0.28)',
                }
              : undefined
          }
        >
          {isOn ? `${currentBrightness}%` : 'OFF'}
        </motion.span>
      </div>

      {/* Icon toggle */}
      <div className={cn('relative flex items-center justify-center', tier === 'sm' ? 'shrink-0' : 'flex-1 min-h-0')}>
        {/* Halo projeté : la lampe éclaire autour d'elle quand elle est
            allumée, et garde un anneau discret éteinte — sans lui la card se
            réduisait à une icône flottant dans le vide. Réservé au palier
            `lg` : plus bas il débordait sur les onglets. */}
        {tier === 'lg' && (
          <motion.span
            aria-hidden
            className='rounded-full border pointer-events-none'
            style={{
              position: 'absolute',
              width: haloSize,
              height: haloSize,
              borderColor: isOn ? `${accentColor ?? '#fbbf24'}22` : 'rgba(255,255,255,0.05)',
              background: isOn ? `radial-gradient(circle, ${accentColor ?? '#fbbf24'}26 0%, transparent 70%)` : 'transparent',
            }}
            animate={isOn ? { scale: [1, 1.05, 1], opacity: [0.75, 1, 0.75] } : { scale: 1, opacity: 1 }}
            transition={isOn ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
          />
        )}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleToggle}
          className={cn('relative border flex items-center justify-center transition-all duration-300', iconBtnClass)}
          style={
            isOn
              ? {
                  background: accentColor ? `${accentColor}18` : 'rgba(251,191,36,0.14)',
                  borderColor: accentColor ? `${accentColor}35` : 'rgba(251,191,36,0.25)',
                  boxShadow: `0 0 22px -6px ${accentColor ?? '#fbbf24'}, inset 0 1px 0 rgba(255,255,255,0.10)`,
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }
          }
        >
          {isOn && (
            <div
              className={cn('absolute inset-0 blur-xl opacity-20 pointer-events-none', tier === 'sm' ? 'rounded-xl' : 'rounded-2xl')}
              style={{ background: accentColor ?? '#fbbf24' }}
            />
          )}
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className={cn('relative object-contain', tier === 'sm' ? 'w-5 h-5' : 'w-7 h-7')} />
          ) : CustomIcon ? (
            // L'icône est résolue depuis la config utilisateur : elle ne peut
            // pas être hissée hors du rendu, son identité dépend de la config.
            // eslint-disable-next-line react-hooks/static-components
            <CustomIcon
              size={iconSize}
              className={cn('relative transition-all duration-300', isOn ? '' : 'text-white/25')}
              style={isOn ? { color: accentColor ?? '#fbbf24', filter: `drop-shadow(0 0 10px ${accentColor ?? '#fbbf24'}99)` } : undefined}
            />
          ) : (
            <Lightbulb
              size={iconSize}
              className={cn('relative transition-all duration-300', isOn ? '' : 'text-white/25')}
              style={isOn ? { color: accentColor ?? '#fbbf24', filter: `drop-shadow(0 0 10px ${accentColor ?? '#fbbf24'}99)` } : undefined}
            />
          )}
        </motion.button>
      </div>

      {/* Palier `sm` — nom et état à droite du bouton */}
      {tier === 'sm' && (
        <div className='flex-1 min-w-0'>
          <div className='text-white/40 text-xs font-medium truncate'>{name}</div>
          <div className='text-xs font-semibold truncate' style={{ color: isOn ? (accentColor ?? '#fbbf24') : 'rgba(255,255,255,0.25)' }}>
            {isOn ? `${currentBrightness}%` : t('widgets.light.off')}
          </div>
        </div>
      )}

      {/* Contrôles — visibles même éteinte (en retrait) : sinon la card se
          vidait entièrement dès qu'on éteignait. Bouger un curseur rallume,
          `light.turn_on` porte déjà la valeur. */}
      <AnimatePresence>
        {visibleTabs.length > 0 && tier !== 'sm' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={cn('shrink-0 overflow-hidden transition-opacity duration-300', isOn ? 'opacity-100' : 'opacity-45')}
          >
            <div className='mt-2'>
              {/* Onglets — seulement au palier `lg` : sur deux rangées ils
                  mangeaient la place du bouton, la luminosité suffit. */}
              {hasTabs && tier === 'lg' && (
                <div className='flex gap-1 mb-2'>
                  {visibleTabs.map(tab => (
                    <button
                      key={tab}
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTab(tab);
                      }}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all',
                        currentTab === tab
                          ? 'text-amber-300 border-amber-400/25'
                          : 'bg-white/5 text-white/30 border-white/8 hover:bg-white/8'
                      )}
                      style={currentTab === tab ? { background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.25)' } : undefined}
                    >
                      {tab === 'brightness' && <Lightbulb size={10} />}
                      {tab === 'colortemp' && <Thermometer size={10} />}
                      {tab === 'color' && <Palette size={10} />}
                      {tab === 'brightness' && t('widgets.light.brightness')}
                      {tab === 'colortemp' && t('widgets.light.colorTemp')}
                      {tab === 'color' && t('widgets.light.color')}
                    </button>
                  ))}
                </div>
              )}

              {/* Brightness slider */}
              {currentTab === 'brightness' && (
                <input
                  type='range'
                  min={1}
                  max={100}
                  value={currentBrightness}
                  onChange={handleBrightnessChange}
                  onClick={e => e.stopPropagation()}
                  className='w-full h-1.5 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-md'
                  style={
                    {
                      background: `linear-gradient(to right, ${accentColor ?? 'rgba(251,191,36,0.55)'} 0%, ${accentColor ?? 'rgba(251,191,36,0.55)'} ${currentBrightness}%, rgba(255,255,255,0.06) ${currentBrightness}%, rgba(255,255,255,0.06) 100%)`,
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)',
                      '--thumb-color': accentColor ?? '#fbbf24',
                    } as React.CSSProperties & Record<string, string>
                  }
                />
              )}

              {/* Color temperature slider */}
              {currentTab === 'colortemp' && (
                <div>
                  <input
                    type='range'
                    min={0}
                    max={100}
                    value={colorTempSlider}
                    onChange={handleColorTempChange}
                    onClick={e => e.stopPropagation()}
                    className='w-full h-1 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab
                      [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-md'
                    style={{
                      background: `linear-gradient(to right, #ff9d4d, #ffe4b5 40%, #ffffff 65%, #cce8ff)`,
                    }}
                  />
                  <div className='flex justify-between mt-1'>
                    <span className='text-[9px] text-orange-300/60'>{t('widgets.light.warm')}</span>
                    <span className='text-[9px] text-blue-200/60'>{t('widgets.light.cold')}</span>
                  </div>
                </div>
              )}

              {/* Hue color slider */}
              {currentTab === 'color' && (
                <div>
                  <input
                    type='range'
                    min={0}
                    max={359}
                    value={currentHue}
                    onChange={handleHueChange}
                    onClick={e => e.stopPropagation()}
                    className='w-full h-1 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab
                      [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/30'
                    style={{
                      background:
                        'linear-gradient(to right, hsl(0,90%,55%), hsl(30,90%,55%), hsl(60,90%,55%), hsl(90,90%,55%), hsl(120,90%,55%), hsl(150,90%,55%), hsl(180,90%,55%), hsl(210,90%,55%), hsl(240,90%,55%), hsl(270,90%,55%), hsl(300,90%,55%), hsl(330,90%,55%), hsl(360,90%,55%))',
                    }}
                  />
                  <div className='flex justify-center mt-1'>
                    <div
                      className='w-4 h-4 rounded-full border border-white/20 shadow'
                      style={{ background: `hsl(${currentHue}, 80%, 55%)` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State label — le palier `sm` l'affiche déjà à côté du bouton */}
      <div className={cn('text-center shrink-0', tier === 'sm' ? 'hidden' : tier === 'md' ? 'mt-0.5' : 'mt-1.5')}>
        <span
          className={cn(
            'font-semibold transition-colors duration-300',
            tier === 'md' ? 'text-[10px]' : 'text-xs',
            isOn ? 'text-amber-400/70' : 'text-white/20'
          )}
        >
          {isOn ? t('widgets.light.on') : t('widgets.light.off')}
        </span>
      </div>
    </motion.div>
  );
}

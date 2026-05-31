import { Palette, Image, Sliders, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId, type BackgroundMode, type EffectPalette } from '@/config/themes';
import { ImageBackgroundPicker } from './ImageBackgroundPicker';
import { useI18n } from '@/i18n';

export function AppearanceSection() {
  const { t } = useI18n();
  const { themeId, tokens, setTheme, background, setBackground, cardOpacity, setCardOpacity, autoTheme, setAutoTheme } = useTheme();

  return (
    <div className='flex flex-col gap-7'>
      {/* Theme selector */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Palette size={12} /> {t('settings.appearance_section.theme')}
        </h3>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.entries(THEMES) as [ThemeId, (typeof THEMES)[ThemeId]][]).map(([id, theme]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                themeId === id ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <div
                className='w-full h-6 rounded-lg mb-2'
                style={{
                  backgroundColor: theme.tokens.bgPrimary,
                  border: `1px solid ${theme.tokens.border}`,
                }}
              />
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card opacity (hidden in clay mode — cards are opaque) */}
      {tokens.mode !== 'clay' && (
        <div>
          <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
            <Sliders size={12} /> {t('settings.appearance_section.cardOpacity')}
          </h3>
          <div className='flex items-center gap-3'>
            <input
              type='range'
              min={0}
              max={100}
              value={Math.round(cardOpacity * 100)}
              onChange={e => setCardOpacity(parseInt(e.target.value, 10) / 100)}
              className='flex-1 accent-blue-500'
            />
            <span className='text-white/50 text-sm w-10 text-right tabular-nums'>{Math.round(cardOpacity * 100)}%</span>
          </div>
        </div>
      )}

      {/* Auto day/night theme */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Sun size={12} /> {t('settings.appearance_section.autoTheme')}
        </h3>
        <p className='text-white/30 text-[11px] mb-3'>{t('settings.appearance_section.autoThemeDesc')}</p>
        <label className='flex items-center gap-3 cursor-pointer mb-3'>
          <input
            type='checkbox'
            checked={autoTheme.enabled}
            onChange={e => setAutoTheme({ ...autoTheme, enabled: e.target.checked })}
            className='accent-blue-500 w-4 h-4'
          />
          <span className='text-white/60 text-sm'>{t('settings.appearance_section.autoTheme')}</span>
        </label>
        {autoTheme.enabled && (
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <span className='text-white/40 text-[10px] uppercase tracking-wider block mb-1.5'>
                {t('settings.appearance_section.autoThemeLight')}
              </span>
              <select
                value={autoTheme.lightTheme}
                onChange={e => setAutoTheme({ ...autoTheme, lightTheme: e.target.value as ThemeId })}
                className='w-full bg-white/8 border border-white/12 rounded-lg px-2 py-1.5 text-white/70 text-xs'
              >
                {(Object.keys(THEMES) as ThemeId[]).map(id => (
                  <option key={id} value={id}>
                    {THEMES[id].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className='text-white/40 text-[10px] uppercase tracking-wider block mb-1.5'>
                {t('settings.appearance_section.autoThemeDark')}
              </span>
              <select
                value={autoTheme.darkTheme}
                onChange={e => setAutoTheme({ ...autoTheme, darkTheme: e.target.value as ThemeId })}
                className='w-full bg-white/8 border border-white/12 rounded-lg px-2 py-1.5 text-white/70 text-xs'
              >
                {(Object.keys(THEMES) as ThemeId[]).map(id => (
                  <option key={id} value={id}>
                    {THEMES[id].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Background */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Image size={12} /> {t('settings.appearance_section.background')}
        </h3>
        <div className='flex flex-wrap gap-2 mb-4'>
          {(['solid', 'gradient', 'image', 'aurora', 'lavaLamp'] as BackgroundMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setBackground({ ...background, mode })}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                background.mode === mode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/8'
              }`}
            >
              {mode === 'solid'
                ? t('settings.appearance_section.backgroundSolid')
                : mode === 'gradient'
                  ? t('settings.appearance_section.backgroundGradient')
                  : mode === 'image'
                    ? t('settings.appearance_section.backgroundImage')
                    : mode === 'aurora'
                      ? t('settings.appearance_section.backgroundAurora')
                      : t('settings.appearance_section.backgroundLavaLamp')}
            </button>
          ))}
        </div>

        {background.mode === 'solid' && (
          <div className='flex items-center gap-3'>
            <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.color')}</label>
            <input
              type='color'
              value={background.color ?? '#0a0a14'}
              onChange={e => setBackground({ ...background, color: e.target.value })}
              className='w-8 h-8 rounded cursor-pointer border-0 bg-transparent'
            />
          </div>
        )}

        {background.mode === 'gradient' && (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
              <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.color1')}</label>
              <input
                type='color'
                value={background.gradientFrom ?? '#0a0a14'}
                onChange={e => setBackground({ ...background, gradientFrom: e.target.value })}
                className='w-8 h-8 rounded cursor-pointer border-0 bg-transparent'
              />
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.color2')}</label>
              <input
                type='color'
                value={background.gradientTo ?? '#1a1a2e'}
                onChange={e => setBackground({ ...background, gradientTo: e.target.value })}
                className='w-8 h-8 rounded cursor-pointer border-0 bg-transparent'
              />
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.angle')}</label>
              <input
                type='range'
                min={0}
                max={360}
                value={background.gradientAngle ?? 135}
                onChange={e => setBackground({ ...background, gradientAngle: parseInt(e.target.value, 10) })}
                className='flex-1 accent-blue-500'
              />
              <span className='text-white/40 text-xs w-8 tabular-nums'>{background.gradientAngle ?? 135}°</span>
            </div>
          </div>
        )}

        {background.mode === 'image' && <ImageBackgroundPicker background={background} setBackground={setBackground} />}
        {background.mode === 'image' && (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3'>
              <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.overlay')}</label>
              <input
                type='range'
                min={0}
                max={100}
                value={Math.round((background.overlayOpacity ?? 0.5) * 100)}
                onChange={e => setBackground({ ...background, overlayOpacity: parseInt(e.target.value, 10) / 100 })}
                className='flex-1 accent-blue-500'
              />
              <span className='text-white/40 text-xs w-8 tabular-nums'>{Math.round((background.overlayOpacity ?? 0.5) * 100)}%</span>
            </div>
          </div>
        )}

        {(background.mode === 'aurora' || background.mode === 'lavaLamp') &&
          (() => {
            const isAurora = background.mode === 'aurora';
            const cfg = isAurora ? (background.aurora ?? {}) : (background.lava ?? {});
            const countKey = isAurora ? 'orbCount' : 'blobCount';
            const countLabel = isAurora
              ? t('settings.appearance_section.effectOrbCount')
              : t('settings.appearance_section.effectBlobCount');
            const count = (cfg as Record<string, number | undefined>)[countKey] ?? 5;
            const palette = cfg.palette ?? 'default';
            const speed = cfg.speed ?? 1;
            const size = cfg.size ?? 1;
            const opacity = cfg.opacity ?? 1;
            const sway = cfg.sway ?? 1;

            const update = (patch: object) => {
              if (isAurora) {
                setBackground({ ...background, aurora: { ...cfg, ...patch } });
              } else {
                setBackground({ ...background, lava: { ...cfg, ...patch } });
              }
            };

            const palettes: { id: EffectPalette; label: string }[] = [
              { id: 'default', label: t('settings.appearance_section.effectPaletteDefault') },
              { id: 'warm', label: t('settings.appearance_section.effectPaletteWarm') },
              { id: 'cool', label: t('settings.appearance_section.effectPaletteCool') },
              { id: 'nature', label: t('settings.appearance_section.effectPaletteNature') },
              { id: 'mono', label: t('settings.appearance_section.effectPaletteMono') },
            ];

            return (
              <div className='flex flex-col gap-3 mt-1'>
                {/* Palette */}
                <div>
                  <span className='text-white/40 text-[10px] uppercase tracking-wider block mb-1.5'>
                    {t('settings.appearance_section.effectPalette')}
                  </span>
                  <div className='flex flex-wrap gap-1.5'>
                    {palettes.map(p => (
                      <button
                        key={p.id}
                        onClick={() => update({ palette: p.id })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          palette === p.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/8'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div className='flex items-center gap-3'>
                  <label className='text-white/45 text-xs w-16'>{countLabel}</label>
                  <input
                    type='range'
                    min={1}
                    max={12}
                    step={1}
                    value={count}
                    onChange={e => update({ [countKey]: parseInt(e.target.value, 10) })}
                    className='flex-1 accent-blue-500'
                  />
                  <span className='text-white/40 text-xs w-8 tabular-nums text-right'>{count}</span>
                </div>

                {/* Speed */}
                <div className='flex items-center gap-3'>
                  <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.effectSpeed')}</label>
                  <input
                    type='range'
                    min={10}
                    max={300}
                    step={10}
                    value={Math.round(speed * 100)}
                    onChange={e => update({ speed: parseInt(e.target.value, 10) / 100 })}
                    className='flex-1 accent-blue-500'
                  />
                  <span className='text-white/40 text-xs w-8 tabular-nums text-right'>{Math.round(speed * 100)}%</span>
                </div>

                {/* Size */}
                <div className='flex items-center gap-3'>
                  <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.effectSize')}</label>
                  <input
                    type='range'
                    min={30}
                    max={200}
                    step={10}
                    value={Math.round(size * 100)}
                    onChange={e => update({ size: parseInt(e.target.value, 10) / 100 })}
                    className='flex-1 accent-blue-500'
                  />
                  <span className='text-white/40 text-xs w-8 tabular-nums text-right'>{Math.round(size * 100)}%</span>
                </div>

                {/* Opacity / Intensity */}
                <div className='flex items-center gap-3'>
                  <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.effectOpacity')}</label>
                  <input
                    type='range'
                    min={10}
                    max={200}
                    step={10}
                    value={Math.round(opacity * 100)}
                    onChange={e => update({ opacity: parseInt(e.target.value, 10) / 100 })}
                    className='flex-1 accent-blue-500'
                  />
                  <span className='text-white/40 text-xs w-8 tabular-nums text-right'>{Math.round(opacity * 100)}%</span>
                </div>

                {/* Sway / Movement */}
                <div className='flex items-center gap-3'>
                  <label className='text-white/45 text-xs w-16'>{t('settings.appearance_section.effectSway')}</label>
                  <input
                    type='range'
                    min={0}
                    max={300}
                    step={10}
                    value={Math.round(sway * 100)}
                    onChange={e => update({ sway: parseInt(e.target.value, 10) / 100 })}
                    className='flex-1 accent-blue-500'
                  />
                  <span className='text-white/40 text-xs w-8 tabular-nums text-right'>{Math.round(sway * 100)}%</span>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

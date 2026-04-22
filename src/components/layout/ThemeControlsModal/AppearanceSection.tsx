import { Palette, Image, Sliders, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId, type BackgroundMode } from '@/config/themes';
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
        <div className='flex gap-2 mb-4'>
          {(['solid', 'gradient', 'image'] as BackgroundMode[]).map(mode => (
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
                  : t('settings.appearance_section.backgroundImage')}
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
      </div>
    </div>
  );
}

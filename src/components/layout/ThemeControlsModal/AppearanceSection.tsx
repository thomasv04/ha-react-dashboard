import { Palette, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId, type BuiltInThemeId } from '@/config/themes';
import { useI18n } from '@/i18n';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { DEFAULT_ILLUMINANCE_THRESHOLD } from '@/hooks/useAutoTheme';
import { HAThemeImport } from './HAThemeImport';
import { FIELD_LABEL, SECTION_HEADING } from './typography';
import { cn } from '@/lib/utils';

export function AppearanceSection() {
  const { t } = useI18n();
  const { themeId, setTheme, autoTheme, setAutoTheme } = useTheme();

  return (
    <div className='flex flex-col gap-7'>
      {/* Theme selector */}
      <div>
        <h3 className={cn(SECTION_HEADING, 'mb-3 flex items-center gap-2')}>
          <Palette size={12} /> {t('settings.appearance_section.theme')}
        </h3>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.entries(THEMES) as [BuiltInThemeId, (typeof THEMES)[BuiltInThemeId]][]).map(([id, theme]) => (
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

      {/* Thème repris de Home Assistant */}
      <HAThemeImport />

      {/* Auto day/night theme */}
      <div>
        <h3 className={cn(SECTION_HEADING, 'mb-3 flex items-center gap-2')}>
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
              <span className={cn(FIELD_LABEL, 'block mb-1.5')}>{t('settings.appearance_section.autoThemeLight')}</span>
              <select
                value={autoTheme.lightTheme}
                onChange={e => setAutoTheme({ ...autoTheme, lightTheme: e.target.value as ThemeId })}
                className='w-full bg-white/8 border border-white/12 rounded-lg px-2 py-1.5 text-white/70 text-xs'
              >
                {(Object.keys(THEMES) as BuiltInThemeId[]).map(id => (
                  <option key={id} value={id}>
                    {THEMES[id].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={cn(FIELD_LABEL, 'block mb-1.5')}>{t('settings.appearance_section.autoThemeDark')}</span>
              <select
                value={autoTheme.darkTheme}
                onChange={e => setAutoTheme({ ...autoTheme, darkTheme: e.target.value as ThemeId })}
                className='w-full bg-white/8 border border-white/12 rounded-lg px-2 py-1.5 text-white/70 text-xs'
              >
                {(Object.keys(THEMES) as BuiltInThemeId[]).map(id => (
                  <option key={id} value={id}>
                    {THEMES[id].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Source de la bascule : le soleil, ou un capteur de luminosité. */}
        {autoTheme.enabled && (
          <div className='mt-4 flex flex-col gap-2.5'>
            <span className={FIELD_LABEL}>{t('settings.appearance_section.autoThemeSource')}</span>
            <EntityPicker
              label={t('settings.appearance_section.autoThemeSensor')}
              domain='sensor'
              value={autoTheme.illuminanceEntity ?? ''}
              onChange={v => setAutoTheme({ ...autoTheme, illuminanceEntity: v })}
            />
            <p className='text-white/25 text-[11px] leading-relaxed'>{t('settings.appearance_section.autoThemeSensorDesc')}</p>

            {autoTheme.illuminanceEntity && (
              <div className='flex items-center gap-3'>
                <label className='text-white/45 text-xs w-24'>{t('settings.appearance_section.autoThemeThreshold')}</label>
                <input
                  type='number'
                  min={0}
                  value={autoTheme.illuminanceThreshold ?? DEFAULT_ILLUMINANCE_THRESHOLD}
                  onChange={e => setAutoTheme({ ...autoTheme, illuminanceThreshold: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className='w-24 bg-white/8 border border-white/12 rounded-lg px-2 py-1.5 text-white/70 text-xs'
                />
                <span className='text-white/25 text-[11px] flex-1'>{t('settings.appearance_section.autoThemeThresholdDesc')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

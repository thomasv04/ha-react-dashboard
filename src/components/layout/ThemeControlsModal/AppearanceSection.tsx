import { Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId, type BuiltInThemeId, type ThemeTokens } from '@/config/themes';
import { useI18n } from '@/i18n';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { SwitchTrack } from '@/components/ds/Switch';
import { DEFAULT_ILLUMINANCE_THRESHOLD } from '@/hooks/useAutoTheme';
import { HAThemeImport } from './HAThemeImport';
import { FIELD_LABEL, SECTION_HEADING, SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

/** Une vignette de dashboard aux couleurs du thème : fond, trois cartes, accent. */
function ThemePreview({ tokens }: { tokens: ThemeTokens }) {
  return (
    <span
      aria-hidden
      className='relative block h-[120px] w-full overflow-hidden rounded-[var(--ds-radius-lg)]'
      style={{ background: tokens.bgPrimary }}
    >
      <span className='absolute left-3 top-3 size-4 rounded-[5px]' style={{ background: tokens.accent }} />
      <span className='absolute right-3 top-2.5 h-3 w-10 rounded' style={{ background: tokens.textPrimary }} />
      <span className='absolute bottom-3 left-3 top-10 w-[42%] rounded-xl' style={{ background: tokens.bgCard }} />
      <span className='absolute right-3 top-10 h-[34%] w-[46%] rounded-xl' style={{ background: tokens.bgCard }} />
      <span className='absolute bottom-3 right-3 h-[34%] w-[46%] rounded-xl' style={{ background: tokens.bgCard }} />
      <span className='absolute left-6 top-14 h-1.5 w-12 rounded' style={{ background: tokens.textPrimary }} />
      <span className='absolute left-6 top-[72px] h-1.5 w-16 rounded' style={{ background: tokens.textMuted }} />
    </span>
  );
}

export function AppearanceSection() {
  const { t } = useI18n();
  const { themeId, setTheme, autoTheme, setAutoTheme } = useTheme();

  return (
    <div className='flex flex-col gap-4'>
      {/* Thème */}
      <section className={SETTINGS_CARD}>
        <h3 className={cn(SECTION_HEADING, 'mb-4')}>{t('settings.appearance_section.theme')}</h3>
        <div role='radiogroup' aria-label={t('settings.appearance_section.theme')} className='grid grid-cols-2 gap-4'>
          {(Object.entries(THEMES) as [BuiltInThemeId, (typeof THEMES)[BuiltInThemeId]][]).map(([id, theme]) => {
            const on = themeId === id;
            return (
              <button
                key={id}
                role='radio'
                aria-checked={on}
                onClick={() => setTheme(id)}
                className='flex flex-col gap-3 rounded-[var(--ds-radius-xl)] bg-transparent p-1 text-left'
              >
                <span className={cn('rounded-[var(--ds-radius-xl)] p-1', on && 'outline-[3px] outline-[var(--ds-accent)]')}>
                  <ThemePreview tokens={theme.tokens} />
                </span>
                <span
                  className={cn('flex items-center gap-2.5 px-1 text-lg', on ? 'font-semibold' : 'font-medium text-[var(--ds-ink-muted)]')}
                >
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full',
                      on ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'border-2 border-[var(--ds-ink-muted)]'
                    )}
                  >
                    {on && <Check size={16} strokeWidth={3.5} />}
                  </span>
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Thème repris de Home Assistant */}
      <HAThemeImport />

      {/* Thème automatique jour / nuit */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
        <button
          role='switch'
          aria-checked={autoTheme.enabled}
          onClick={() => setAutoTheme({ ...autoTheme, enabled: !autoTheme.enabled })}
          className='flex w-full items-center justify-between gap-4 text-left'
        >
          <span className='min-w-0'>
            <span className={cn(SECTION_HEADING, 'block')}>{t('settings.appearance_section.autoTheme')}</span>
            <span className='mt-1 block text-[15px] text-[var(--ds-ink-muted)]'>{t('settings.appearance_section.autoThemeDesc')}</span>
          </span>
          <SwitchTrack on={autoTheme.enabled} />
        </button>

        {autoTheme.enabled && (
          <div className='grid grid-cols-2 gap-3'>
            {(
              [
                ['autoThemeLight', 'lightTheme'],
                ['autoThemeDark', 'darkTheme'],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className='flex flex-col gap-2'>
                <span className={FIELD_LABEL}>{t(`settings.appearance_section.${label}`)}</span>
                <select
                  value={autoTheme[key]}
                  onChange={e => setAutoTheme({ ...autoTheme, [key]: e.target.value as ThemeId })}
                  className='h-12 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base text-[var(--ds-ink)]'
                >
                  {(Object.keys(THEMES) as BuiltInThemeId[]).map(id => (
                    <option key={id} value={id}>
                      {THEMES[id].label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        {/* Source de la bascule : le soleil, ou un capteur de luminosité. */}
        {autoTheme.enabled && (
          <div className='flex flex-col gap-3'>
            <span className={FIELD_LABEL}>{t('settings.appearance_section.autoThemeSource')}</span>
            <EntityPicker
              label={t('settings.appearance_section.autoThemeSensor')}
              domain='sensor'
              value={autoTheme.illuminanceEntity ?? ''}
              onChange={v => setAutoTheme({ ...autoTheme, illuminanceEntity: v })}
            />
            <p className='text-sm leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.appearance_section.autoThemeSensorDesc')}</p>

            {autoTheme.illuminanceEntity && (
              <div className='flex items-center gap-3'>
                <label className='w-28 text-sm font-semibold text-[var(--ds-ink-muted)]'>
                  {t('settings.appearance_section.autoThemeThreshold')}
                </label>
                <input
                  type='number'
                  min={0}
                  value={autoTheme.illuminanceThreshold ?? DEFAULT_ILLUMINANCE_THRESHOLD}
                  onChange={e => setAutoTheme({ ...autoTheme, illuminanceThreshold: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className='h-12 w-28 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base text-[var(--ds-ink)]'
                />
                <span className='flex-1 text-sm text-[var(--ds-ink-muted)]'>{t('settings.appearance_section.autoThemeThresholdDesc')}</span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

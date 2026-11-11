import { TreePine } from 'lucide-react';
import { useTheme, type ChristmasSettings } from '@/context/ThemeContext';
import { PerfToggle } from './PerfToggle';
import { Segmented } from './controls';
import { useI18n } from '@/i18n';
import { FIELD_LABEL, SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

export function ChristmasSection() {
  const { t } = useI18n();
  const { christmasSettings: c, setChristmasSettings, perfSettings } = useTheme();
  const set = (patch: Partial<ChristmasSettings>) => setChristmasSettings({ ...c, ...patch });

  return (
    <div className='flex flex-col gap-3'>
      <div className={cn(SETTINGS_CARD, 'flex items-center gap-4')}>
        <TreePine size={24} className='shrink-0 text-[var(--ds-ink-muted)]' />
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.christmas_section.intro')}</p>
      </div>

      <div className={cn(SETTINGS_CARD, 'flex flex-col gap-2')}>
        <span className={FIELD_LABEL}>{t('settings.christmas_section.mode')}</span>
        <Segmented
          label={t('settings.christmas_section.mode')}
          value={c.mode}
          onChange={mode => set({ mode })}
          options={[
            { value: 'off', label: t('settings.christmas_section.modeOff') },
            { value: 'season', label: t('settings.christmas_section.modeSeason') },
            { value: 'on', label: t('settings.christmas_section.modeOn') },
          ]}
        />
        <p className='text-sm text-[var(--ds-ink-muted)]'>{t('settings.christmas_section.modeSeasonDesc')}</p>
      </div>

      {c.mode !== 'off' && (
        <>
          <PerfToggle
            checked={c.snow}
            onChange={snow => set({ snow })}
            label={t('settings.christmas_section.snow')}
            description={t(perfSettings.reduceAnimations ? 'settings.christmas_section.snowPerf' : 'settings.christmas_section.snowDesc')}
          />
          {c.snow && (
            <div className={cn(SETTINGS_CARD, 'flex flex-col gap-2')}>
              <span className={FIELD_LABEL}>{t('settings.christmas_section.snowAmount')}</span>
              <Segmented
                label={t('settings.christmas_section.snowAmount')}
                value={c.snowAmount}
                onChange={snowAmount => set({ snowAmount })}
                options={[
                  { value: 'light', label: t('settings.christmas_section.snowLight') },
                  { value: 'normal', label: t('settings.christmas_section.snowNormal') },
                  { value: 'heavy', label: t('settings.christmas_section.snowHeavy') },
                ]}
              />
            </div>
          )}
          <PerfToggle
            checked={c.garlands}
            onChange={garlands => set({ garlands })}
            label={t('settings.christmas_section.garlands')}
            description={t('settings.christmas_section.garlandsDesc')}
          />
          {c.garlands && (
            <PerfToggle
              checked={c.twinkle}
              onChange={twinkle => set({ twinkle })}
              label={t('settings.christmas_section.twinkle')}
              description={t('settings.christmas_section.twinkleDesc')}
            />
          )}
          <PerfToggle
            checked={c.snowCaps}
            onChange={snowCaps => set({ snowCaps })}
            label={t('settings.christmas_section.snowCaps')}
            description={t('settings.christmas_section.snowCapsDesc')}
          />
          {c.snowCaps && (
            <PerfToggle
              checked={c.drawnSnow}
              onChange={drawnSnow => set({ drawnSnow })}
              label={t('settings.christmas_section.drawnSnow')}
              description={t('settings.christmas_section.drawnSnowDesc')}
            />
          )}
          <PerfToggle
            checked={c.stars}
            onChange={stars => set({ stars })}
            label={t('settings.christmas_section.stars')}
            description={t('settings.christmas_section.starsDesc')}
          />
        </>
      )}
    </div>
  );
}

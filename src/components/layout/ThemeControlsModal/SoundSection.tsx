import { Volume2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PerfToggle } from './PerfToggle';
import { useI18n } from '@/i18n';
import { playSound } from '@/lib/sounds';
import { SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

export function SoundSection() {
  const { t } = useI18n();
  const { soundSettings, setSoundSettings } = useTheme();

  function toggleEnabled() {
    const next = !soundSettings.enabled;
    setSoundSettings({ ...soundSettings, enabled: next });
    if (next) playSound('notification');
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className={cn(SETTINGS_CARD, 'flex items-center gap-4')}>
        <Volume2 size={24} className='shrink-0 text-[var(--ds-ink-muted)]' />
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.sound_section.intro')}</p>
      </div>

      <div className='flex flex-col'>
        <PerfToggle
          checked={soundSettings.enabled}
          onChange={toggleEnabled}
          label={t('settings.sound_section.enabled')}
          description={t('settings.sound_section.enabledDesc')}
        />
      </div>
    </div>
  );
}

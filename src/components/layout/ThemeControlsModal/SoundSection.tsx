import { Volume2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PerfToggle } from './PerfToggle';
import { useI18n } from '@/i18n';
import { playSound } from '@/lib/sounds';

export function SoundSection() {
  const { t } = useI18n();
  const { soundSettings, setSoundSettings } = useTheme();

  function toggleEnabled() {
    const next = !soundSettings.enabled;
    setSoundSettings({ ...soundSettings, enabled: next });
    if (next) playSound('notification');
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-center gap-3 p-4 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)]'>
        <Volume2 size={16} className='text-[var(--ds-ink-muted)] shrink-0' />
        <p className='text-[var(--ds-ink-muted)] text-xs leading-relaxed'>{t('settings.sound_section.intro')}</p>
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

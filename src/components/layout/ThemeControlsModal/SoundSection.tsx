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
      <div className='flex items-center gap-3 p-4 rounded-xl bg-white/4 border border-white/8'>
        <Volume2 size={16} className='text-white/40 shrink-0' />
        <p className='text-white/35 text-xs leading-relaxed'>{t('settings.sound_section.intro')}</p>
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

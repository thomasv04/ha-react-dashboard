import { useState } from 'react';
import { Palette, Zap, Languages, Server, LayoutGrid, Volume2, Globe, X, type LucideIcon } from 'lucide-react';
import { AppearanceSection } from './AppearanceSection';
import { PerformanceSection } from './PerformanceSection';
import { LanguageSection } from './LanguageSection';
import { SystemSection } from './SystemSection';
import { LayoutSection } from './LayoutSection';
import { SoundSection } from './SoundSection';
import { RegionalSection } from './RegionalSection';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { isPanelMode } from '@/lib/api-base';

type SettingsSection = 'appearance' | 'layout' | 'performance' | 'sound' | 'regional' | 'language' | 'system';

/** Couleur de la pastille de chaque section, comme celles du lanceur. */
const SECTION_COLORS: Record<SettingsSection, string> = {
  appearance: '#2f80ed',
  layout: '#2b9fb0',
  performance: '#ee8a2c',
  sound: '#e8466b',
  regional: '#2fb38a',
  language: '#8e5cf0',
  system: '#4a5a78',
};

export function SettingsContent({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [section, setSection] = useState<SettingsSection>('appearance');

  const NAV_ITEMS: { id: SettingsSection; label: string; Icon: LucideIcon }[] = [
    { id: 'appearance', label: t('settings.appearance'), Icon: Palette },
    // Il n'y reste que le plein écran, qui n'a de sens qu'en carte Lovelace.
    ...(isPanelMode() ? [{ id: 'layout' as const, label: t('settings.layout'), Icon: LayoutGrid }] : []),
    { id: 'performance', label: t('settings.performance'), Icon: Zap },
    { id: 'sound', label: t('settings.sound'), Icon: Volume2 },
    { id: 'regional', label: t('settings.regional'), Icon: Globe },
    { id: 'language', label: t('settings.language'), Icon: Languages },
    { id: 'system', label: t('settings.system'), Icon: Server },
  ];

  const current = NAV_ITEMS.find(item => item.id === section) ?? NAV_ITEMS[0];

  return (
    <div className='flex h-full gap-3 p-3'>
      {/* ── Liste des réglages ── */}
      <nav
        aria-label={t('settings.title')}
        className='flex w-[260px] shrink-0 flex-col gap-1 overflow-y-auto rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-3'
      >
        <h2 className='px-3 pb-2 pt-2 text-lg font-semibold text-[var(--ds-ink-muted)]'>{t('settings.title')}</h2>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            aria-current={section === id ? 'page' : undefined}
            className={cn(
              'flex h-14 w-full items-center gap-3 rounded-[var(--ds-radius-lg)] px-3 text-left text-[17px]',
              section === id ? 'bg-[var(--ds-surface-3)] font-semibold' : 'font-medium text-[var(--ds-ink-muted)]'
            )}
          >
            <span className='flex size-10 shrink-0 items-center justify-center rounded-[13px]' style={{ background: SECTION_COLORS[id] }}>
              <Icon size={20} className='text-white' />
            </span>
            <span className='truncate'>{label}</span>
          </button>
        ))}

        {/* La version : c'est le premier renseignement qu'on cherche ici. */}
        <p className='mt-auto px-3 pt-3 text-sm text-[var(--ds-ink-muted)]'>
          {t('settings.footer')} <span className='font-mono'>v{__BUILD_VERSION__}</span>
        </p>
      </nav>

      {/* ── Contenu ── */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex shrink-0 items-center justify-between px-3 pb-3 pt-2'>
          <h2 className='text-[32px] font-semibold'>{current.label}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className='flex size-12 items-center justify-center rounded-full bg-[var(--ds-surface-1)]'
          >
            <X size={20} />
          </button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
          {section === 'appearance' && <AppearanceSection />}
          {section === 'layout' && <LayoutSection />}
          {section === 'performance' && <PerformanceSection />}
          {section === 'sound' && <SoundSection />}
          {section === 'regional' && <RegionalSection />}
          {section === 'language' && <LanguageSection />}
          {section === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  );
}

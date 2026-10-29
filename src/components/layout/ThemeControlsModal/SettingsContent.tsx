import { useState } from 'react';
import { Settings, Palette, Zap, Languages, Server, LayoutGrid, Volume2, Globe, X } from 'lucide-react';
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

export function SettingsContent({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [section, setSection] = useState<SettingsSection>('appearance');

  const NAV_ITEMS: { id: SettingsSection; label: string; Icon: React.ElementType }[] = [
    { id: 'appearance', label: t('settings.appearance'), Icon: Palette },
    // Il n'y reste que le plein écran, qui n'a de sens qu'en carte Lovelace.
    ...(isPanelMode() ? [{ id: 'layout' as const, label: t('settings.layout'), Icon: LayoutGrid }] : []),
    { id: 'performance', label: t('settings.performance'), Icon: Zap },
    { id: 'sound', label: t('settings.sound'), Icon: Volume2 },
    { id: 'regional', label: t('settings.regional'), Icon: Globe },
    { id: 'language', label: t('settings.language'), Icon: Languages },
    { id: 'system', label: t('settings.system'), Icon: Server },
  ];

  const SECTION_TITLES: Record<SettingsSection, string> = {
    appearance: t('settings.appearance'),
    layout: t('settings.layout'),
    performance: t('settings.performance'),
    sound: t('settings.sound'),
    regional: t('settings.regional'),
    language: t('settings.language'),
    system: t('settings.system'),
  };

  return (
    <div className='flex h-full'>
      {/* ── Sidebar ── */}
      <div
        className='w-56 flex-shrink-0 flex flex-col rounded-l-2xl border-r border-[var(--ds-surface-3)]'
        style={{ background: 'rgba(0, 0, 0, 0.18)' }}
      >
        {/* Header */}
        <div className='flex items-center gap-2.5 px-5 pt-5 pb-5 border-b border-[var(--ds-surface-3)]'>
          <div className='p-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'>
            <Settings size={14} className='text-[var(--ds-accent)]' />
          </div>
          <span className='text-[var(--ds-ink)] font-semibold text-sm'>{t('settings.title')}</span>
        </div>

        {/* Nav */}
        {/* Onglets en casse normale : sept intitulés en capitales très espacées
            se lisaient un par un, et « Performances » débordait de la colonne.
            La sélection reprend le bleu translucide du reste de l'application —
            un aplat `bg-[var(--ds-accent)] text-white` plein était le seul de tout le dashboard. */}
        <nav className='flex flex-col gap-0.5 p-3 flex-1'>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--ds-radius-sm)] text-left border transition-colors',
                section === id
                  ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                  : 'border-transparent text-[var(--ds-ink-muted)]'
              )}
            >
              <Icon size={15} className='shrink-0' />
              <span className='text-[13px] font-medium truncate'>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        {/* La version plutôt qu'un simple nom de produit : c'est le premier
            renseignement qu'on cherche quand on ouvre les réglages. */}
        <div className='px-5 py-4 border-t border-[var(--ds-surface-3)] flex items-baseline gap-1.5'>
          <span className='text-[var(--ds-ink-muted)] text-[11px]'>{t('settings.footer')}</span>
          <span className='text-[var(--ds-ink-muted)] text-[10px] font-mono'>v{__BUILD_VERSION__}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className='flex-1 min-w-0 flex flex-col rounded-r-2xl'>
        {/* Top bar */}
        <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--ds-surface-3)] flex-shrink-0'>
          <h2 className='text-[var(--ds-ink)] font-semibold text-base'>{SECTION_TITLES[section]}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto p-6'>
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

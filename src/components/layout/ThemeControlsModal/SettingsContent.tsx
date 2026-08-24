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

type SettingsSection = 'appearance' | 'layout' | 'performance' | 'sound' | 'regional' | 'language' | 'system';

export function SettingsContent({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [section, setSection] = useState<SettingsSection>('appearance');

  const NAV_ITEMS: { id: SettingsSection; label: string; Icon: React.ElementType }[] = [
    { id: 'appearance', label: t('settings.appearance'), Icon: Palette },
    { id: 'layout', label: t('settings.layout'), Icon: LayoutGrid },
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
      <div className='w-56 flex-shrink-0 flex flex-col rounded-l-2xl border-r border-white/6' style={{ background: 'rgba(0, 0, 0, 0.18)' }}>
        {/* Header */}
        <div className='flex items-center gap-2.5 px-5 pt-5 pb-5 border-b border-white/6'>
          <div className='p-1.5 rounded-lg bg-blue-500/20'>
            <Settings size={14} className='text-blue-400' />
          </div>
          <span className='text-white font-semibold text-sm'>{t('settings.title')}</span>
        </div>

        {/* Nav */}
        {/* Onglets en casse normale : sept intitulés en capitales très espacées
            se lisaient un par un, et « Performances » débordait de la colonne.
            La sélection reprend le bleu translucide du reste de l'application —
            un aplat `bg-blue-500` plein était le seul de tout le dashboard. */}
        <nav className='flex flex-col gap-0.5 p-3 flex-1'>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left border transition-colors',
                section === id
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                  : 'border-transparent text-white/45 hover:text-white/75 hover:bg-white/[0.05]'
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
        <div className='px-5 py-4 border-t border-white/5 flex items-baseline gap-1.5'>
          <span className='text-white/25 text-[11px]'>{t('settings.footer')}</span>
          <span className='text-white/15 text-[10px] font-mono'>v{__BUILD_VERSION__}</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className='flex-1 min-w-0 flex flex-col rounded-r-2xl'>
        {/* Top bar */}
        <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/6 flex-shrink-0'>
          <h2 className='text-white font-semibold text-base'>{SECTION_TITLES[section]}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className='p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/10 transition-colors'
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

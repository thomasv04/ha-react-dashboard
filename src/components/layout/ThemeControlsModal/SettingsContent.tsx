import { useState, type MutableRefObject } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Zap,
  Languages,
  Server,
  LayoutGrid,
  Volume2,
  Globe,
  Monitor,
  Music,
  TreePine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useIsPhone } from '@/hooks/useIsMobile';
import { WallPanelSettings } from '@/components/wallpanel/WallPanelSettings';
import { AppearanceSection } from './AppearanceSection';
import { PerformanceSection } from './PerformanceSection';
import { LanguageSection } from './LanguageSection';
import { SystemSection } from './SystemSection';
import { LayoutSection } from './LayoutSection';
import { SoundSection } from './SoundSection';
import { MusicSection } from './MusicSection';
import { ChristmasSection } from './ChristmasSection';
import { RegionalSection } from './RegionalSection';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type SettingsSection =
  'appearance' | 'wallpanel' | 'layout' | 'performance' | 'sound' | 'music' | 'christmas' | 'regional' | 'language' | 'system';

/** Couleur de la pastille de chaque section, comme celles du lanceur. */
const SECTION_COLORS: Record<SettingsSection, string> = {
  appearance: '#2f80ed',
  wallpanel: '#c04fd6',
  layout: '#2b9fb0',
  performance: '#ee8a2c',
  sound: '#e8466b',
  music: '#7a5cf0',
  christmas: '#c0392b',
  regional: '#2fb38a',
  language: '#8e5cf0',
  system: '#4a5a78',
};

export function SettingsContent({ onClose, guard }: { onClose: () => void; guard: MutableRefObject<(() => boolean) | null> }) {
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const [section, setSection] = useState<SettingsSection>('appearance');
  // L'écran de veille garde son brouillon quand on change de section : il reste monté une fois ouvert.
  const [wallpanelSeen, setWallpanelSeen] = useState(false);
  // Téléphone : la liste, puis une section à la fois (retour à la liste en haut à gauche).
  const phone = useIsPhone();
  const [listing, setListing] = useState(true);
  const pick = (id: SettingsSection) => {
    setSection(id);
    setListing(false);
    if (id === 'wallpanel') setWallpanelSeen(true);
  };

  const NAV_ITEMS: { id: SettingsSection; label: string; Icon: LucideIcon }[] = [
    { id: 'appearance', label: t('settings.appearance'), Icon: Palette },
    ...(isAdmin ? [{ id: 'wallpanel' as const, label: t('settings.wallpanel'), Icon: Monitor }] : []),
    // Le plein écran n'y paraît qu'en carte Lovelace ; la pastille utilisateur, partout.
    { id: 'layout' as const, label: t('settings.layout'), Icon: LayoutGrid },
    { id: 'performance', label: t('settings.performance'), Icon: Zap },
    { id: 'sound', label: t('settings.sound'), Icon: Volume2 },
    // Le jeton Music Assistant vaut pour toute la maison : réservé aux administrateurs.
    ...(isAdmin ? [{ id: 'music' as const, label: t('settings.music'), Icon: Music }] : []),
    { id: 'christmas', label: t('settings.christmas'), Icon: TreePine },
    { id: 'regional', label: t('settings.regional'), Icon: Globe },
    { id: 'language', label: t('settings.language'), Icon: Languages },
    { id: 'system', label: t('settings.system'), Icon: Server },
  ];

  const current = NAV_ITEMS.find(item => item.id === section) ?? NAV_ITEMS[0];

  return (
    <div className={cn('flex h-full', phone ? 'flex-col px-4 pt-[calc(env(safe-area-inset-top)+16px)]' : 'gap-4 p-4')}>
      {/* ── Liste des réglages ── */}
      {(!phone || listing) && (
        <nav
          aria-label={t('settings.title')}
          className={cn(
            'flex shrink-0 flex-col gap-1 overflow-y-auto',
            phone
              ? 'min-h-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+16px)]'
              : 'w-[300px] rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-3'
          )}
        >
          {phone ? (
            <div className='mb-3 flex h-11 shrink-0 items-center gap-3'>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                title={t('common.close')}
                className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-2)]'
              >
                <X size={20} aria-hidden='true' />
              </button>
              <h2 className='text-[22px] font-bold'>{t('settings.title')}</h2>
            </div>
          ) : (
            <h2 className='px-3 pb-2 pt-2 text-lg font-semibold text-[var(--ds-ink-muted)]'>{t('settings.title')}</h2>
          )}
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => pick(id)}
              aria-current={!phone && section === id ? 'page' : undefined}
              className={cn(
                'flex w-full items-center text-left',
                phone
                  ? 'min-h-[58px] shrink-0 gap-4 text-lg font-semibold'
                  : cn(
                      'h-14 gap-3 rounded-[var(--ds-radius-lg)] px-3 text-[17px]',
                      section === id ? 'bg-[var(--ds-surface-3)] font-semibold' : 'font-medium text-[var(--ds-ink-muted)]'
                    )
              )}
            >
              <span className='flex size-10 shrink-0 items-center justify-center rounded-[13px]' style={{ background: SECTION_COLORS[id] }}>
                <Icon size={20} className='text-white' />
              </span>
              <span className='min-w-0 flex-1 truncate'>{label}</span>
              {phone && <ChevronRight size={20} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />}
            </button>
          ))}

          {/* La version : c'est le premier renseignement qu'on cherche ici. */}
          <p className='mt-auto px-3 pt-3 text-sm text-[var(--ds-ink-muted)]'>
            {t('settings.footer')} <span className='font-mono'>v{__BUILD_VERSION__}</span>
          </p>
        </nav>
      )}

      {/* ── Contenu ── */}
      {/* L'écran de veille a son aperçu en colonne : il lui faut plus de largeur. */}
      <div
        className={cn(
          'mx-auto min-h-0 min-w-0 w-full flex-1 flex-col',
          phone && listing ? 'hidden' : 'flex',
          section === 'wallpanel' ? 'max-w-[1400px]' : 'max-w-4xl'
        )}
      >
        {phone ? (
          <div className='mb-3 flex h-11 shrink-0 items-center gap-3'>
            <button
              onClick={() => setListing(true)}
              aria-label={t('settings.title')}
              title={t('settings.title')}
              className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-2)]'
            >
              <ChevronLeft size={22} aria-hidden='true' />
            </button>
            <h2 className='min-w-0 flex-1 truncate text-[22px] font-bold'>{current.label}</h2>
          </div>
        ) : (
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
        )}

        <div className={cn('min-h-0 flex-1 overflow-y-auto pr-1', phone && 'pb-[calc(env(safe-area-inset-bottom)+16px)] pr-0')}>
          {section === 'appearance' && <AppearanceSection />}
          {wallpanelSeen && isAdmin && (
            <div className={cn('h-full', section !== 'wallpanel' && 'hidden')}>
              <WallPanelSettings onClose={onClose} guard={guard} />
            </div>
          )}
          {section === 'layout' && <LayoutSection />}
          {section === 'performance' && <PerformanceSection />}
          {section === 'sound' && <SoundSection />}
          {section === 'music' && isAdmin && <MusicSection />}
          {section === 'christmas' && <ChristmasSection />}
          {section === 'regional' && <RegionalSection />}
          {section === 'language' && <LanguageSection />}
          {section === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  );
}

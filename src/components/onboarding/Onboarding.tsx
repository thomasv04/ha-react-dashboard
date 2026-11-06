import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAreas, useHass, useUser } from '@hakit/core';
import {
  ArrowLeft,
  Blinds,
  Calendar,
  Camera,
  Check,
  Lightbulb,
  Moon,
  Music,
  Sun,
  SunMoon,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, Segmented } from '@/components/layout/ThemeControlsModal/controls';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';
import { markTourSeen, startTour } from './TourOverlay';
import { buildStarterLayout, hasControls, type StarterArea } from './starter-layout';
import { areaDomains } from '@/hooks/useAreaControls';

const DONE_KEY = 'ha-dashboard-onboarding-done';
/** Relance l'accueil depuis l'aide, sur une installation déjà configurée. */
export const START_ONBOARDING_EVENT = 'ha-dashboard:start-onboarding';

export function hasDoneOnboarding(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(DONE_KEY, 'true');
  } catch {
    // Stockage refusé : l'accueil reviendra, sans autre conséquence.
  }
}

export type StarterResult = ReturnType<typeof buildStarterLayout>;

type Step = 'welcome' | 'look' | 'rooms' | 'ready';
const STEPS: Step[] = ['welcome', 'look', 'rooms', 'ready'];

/** Le décor de la bienvenue : les apps du dashboard, en pastilles du lanceur. */
const APPS: [LucideIcon, string][] = [
  [Lightbulb, 'var(--ds-tile-on)'],
  [Thermometer, 'var(--ds-app-tv)'],
  [Blinds, 'var(--ds-app-home)'],
  [Music, 'var(--ds-app-music)'],
  [Camera, 'var(--ds-app-photo)'],
  [Calendar, 'var(--ds-app-calendar)'],
];

/** Un écran : titre, texte, contenu, boutons en bas. `wide` : contenu à droite du texte sur grand écran. */
function Screen({
  title,
  body,
  children,
  footer,
  wide,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <div
        className={cn('flex flex-1 flex-col justify-center gap-8 py-8', wide && 'lg:flex-row lg:items-center lg:justify-between lg:gap-12')}
      >
        <div className={cn('flex min-w-0 flex-col gap-3', wide && 'lg:flex-1')}>
          <h1 className='font-[family-name:var(--ds-font-display)] text-[40px] font-extrabold leading-[1.05] sm:text-[56px]'>{title}</h1>
          {body && <p className='max-w-2xl text-lg leading-relaxed text-[var(--ds-ink-muted)] sm:text-xl'>{body}</p>}
        </div>
        {children}
      </div>
      <footer className='flex flex-wrap items-center justify-end gap-3 pb-8'>{footer}</footer>
    </>
  );
}

/**
 * L'accueil d'une installation neuve, en plein écran : bienvenue, langue et
 * apparence, choix des pièces, et une première page construite à partir
 * d'elles. Rien n'est enregistré avant « Créer » ; « Passer » laisse le tableau
 * vide, d'où l'on peut toujours ajouter ses widgets à la main.
 */
export function Onboarding({ onCreate, onClose }: { onCreate: (starter: StarterResult) => Promise<boolean>; onClose: () => void }) {
  const { t, language, setLanguage } = useI18n();
  const { themeId, setTheme, autoTheme, setAutoTheme } = useTheme();
  const user = useUser();
  const areas = useAreas();
  const weatherId = useHass(s => Object.keys(s.entities ?? {}).find(id => id.startsWith('weather.')));

  const [step, setStep] = useState<Step>('welcome');
  // Pièces dont on a inversé le choix proposé : les pièces arrivent après le
  // premier rendu, la sélection par défaut se calcule donc à la lecture.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const index = STEPS.indexOf(step);
  const rooms: StarterArea[] = [...areas].sort((a, b) => a.name.localeCompare(b.name));
  const isSelected = (a: StarterArea) => hasControls(a) !== flipped.has(a.area_id);
  const selected = rooms.filter(isSelected);

  const finish = (withTour: boolean) => {
    markOnboardingDone();
    // La visite démarre d'elle-même au premier lancement, mais pas après une
    // relance depuis l'aide : on la marque vue et on la lance nous-mêmes, une
    // fois le tableau de bord remonté à la place de cet écran.
    markTourSeen();
    onClose();
    if (withTour) setTimeout(() => startTour('basics'), 600);
  };

  const create = async () => {
    setSaving(true);
    const ok = await onCreate(buildStarterLayout(selected, { weatherId, roomsTitle: t('help.onboarding.rooms.panelTitle') }));
    setSaving(false);
    // Un refus du serveur est signalé par un toast : on reste ici, rien n'est perdu.
    if (ok) setStep('ready');
  };

  const look = autoTheme.enabled ? 'auto' : themeId === 'light' ? 'light' : 'dark';
  const setLook = (value: 'dark' | 'light' | 'auto') => {
    setAutoTheme({ ...autoTheme, enabled: value === 'auto' });
    if (value !== 'auto') setTheme(value);
  };

  const skip = (
    <button
      onClick={() => finish(false)}
      data-testid='onboarding-skip'
      className='mr-auto h-12 px-2 text-base font-semibold text-[var(--ds-ink-muted)]'
    >
      {t('help.onboarding.skip')}
    </button>
  );
  const back = (
    <button
      onClick={() => setStep(STEPS[index - 1])}
      aria-label={t('help.onboarding.back')}
      className='flex size-12 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
    >
      <ArrowLeft size={20} />
    </button>
  );
  const next = (label = t('help.onboarding.next')) => (
    <button onClick={() => setStep(STEPS[index + 1])} className={BUTTON_PRIMARY}>
      {label}
    </button>
  );

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={t('help.onboarding.label')}
      data-testid='onboarding'
      className='fixed inset-0 z-[150] overflow-y-auto bg-[var(--ds-sheet)] text-[var(--ds-ink)]'
    >
      <div className='mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 sm:px-12'>
        <div className='flex gap-2 pt-8' aria-hidden='true'>
          {STEPS.map((s, i) => (
            <span key={s} className={cn('h-1.5 flex-1 rounded-full', i <= index ? 'bg-[var(--ds-tile-on)]' : 'bg-[var(--ds-surface-3)]')} />
          ))}
        </div>

        <AnimatePresence mode='wait'>
          <motion.div
            key={step}
            className='flex flex-1 flex-col'
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: DURATION_FAST }}
          >
            {step === 'welcome' && (
              <Screen
                wide
                title={
                  user?.name
                    ? t('help.onboarding.welcome.titleNamed', { value: user.name.split(' ')[0] })
                    : t('help.onboarding.welcome.title')
                }
                body={t('help.onboarding.welcome.body')}
                footer={
                  <>
                    {skip}
                    {next(t('help.onboarding.welcome.start'))}
                  </>
                }
              >
                <div className='grid w-fit shrink-0 grid-cols-3 gap-4' aria-hidden='true'>
                  {APPS.map(([Icon, color], i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.08 * i }}
                      className='flex size-20 items-center justify-center rounded-[var(--ds-radius-lg)] text-white sm:size-24'
                      style={{ background: color }}
                    >
                      <Icon size={36} />
                    </motion.span>
                  ))}
                </div>
              </Screen>
            )}

            {step === 'look' && (
              <Screen
                title={t('help.onboarding.look.title')}
                body={t('help.onboarding.look.body')}
                footer={
                  <>
                    {back}
                    {next()}
                  </>
                }
              >
                <div className='flex flex-col gap-3'>
                  <span className='text-lg font-semibold'>{t('help.onboarding.look.language')}</span>
                  <Segmented
                    label={t('help.onboarding.look.language')}
                    value={language}
                    onChange={setLanguage}
                    options={SUPPORTED_LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
                    className='max-w-md'
                  />
                </div>
                <div className='flex flex-col gap-3'>
                  <span className='text-lg font-semibold'>{t('help.onboarding.look.theme')}</span>
                  <div role='radiogroup' aria-label={t('help.onboarding.look.theme')} className='grid gap-3 sm:grid-cols-3'>
                    {(
                      [
                        ['dark', Moon],
                        ['light', Sun],
                        ['auto', SunMoon],
                      ] as const
                    ).map(([value, Icon]) => (
                      <button
                        key={value}
                        role='radio'
                        aria-checked={look === value}
                        onClick={() => setLook(value)}
                        className={cn(
                          'flex flex-col items-start gap-3 rounded-[var(--ds-radius-xl)] p-5 text-left transition-colors',
                          look === value ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-sheet-section)]'
                        )}
                      >
                        <Icon size={28} />
                        <span className='text-lg font-semibold'>{t(`help.onboarding.look.${value}`)}</span>
                        <span className={cn('text-[15px] leading-snug', look !== value && 'text-[var(--ds-ink-muted)]')}>
                          {t(`help.onboarding.look.${value}Desc`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </Screen>
            )}

            {step === 'rooms' && (
              <Screen
                title={t('help.onboarding.rooms.title')}
                body={rooms.length > 0 ? t('help.onboarding.rooms.body') : t('help.onboarding.rooms.none')}
                footer={
                  <>
                    {back}
                    <button onClick={() => finish(false)} className={cn(BUTTON_SECONDARY, 'mr-auto')}>
                      {t('help.onboarding.rooms.empty')}
                    </button>
                    <button onClick={create} disabled={saving} data-testid='onboarding-create' className={BUTTON_PRIMARY}>
                      {saving ? t('help.onboarding.rooms.creating') : t('help.onboarding.rooms.create', { value: selected.length })}
                    </button>
                  </>
                }
              >
                {rooms.length > 0 && (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {rooms.map(area => {
                      const on = isSelected(area);
                      return (
                        <button
                          key={area.area_id}
                          role='checkbox'
                          aria-checked={on}
                          onClick={() =>
                            setFlipped(prev => {
                              const nextSet = new Set(prev);
                              if (!nextSet.delete(area.area_id)) nextSet.add(area.area_id);
                              return nextSet;
                            })
                          }
                          className='flex min-h-[72px] items-center gap-4 rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] px-5 text-left'
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-full',
                              on ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'border-2 border-[var(--ds-surface-3)]'
                            )}
                          >
                            {on && <Check size={18} strokeWidth={3} />}
                          </span>
                          <span className='min-w-0'>
                            <span className='block truncate text-lg font-semibold'>{area.name}</span>
                            <span className='block text-[15px] text-[var(--ds-ink-muted)]'>
                              {areaDomains(area)
                                .map(d => t(`widgets.room.domains.${d}`))
                                .join(' · ') || t('help.onboarding.rooms.nothing')}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Screen>
            )}

            {step === 'ready' && (
              <Screen
                title={t('help.onboarding.ready.title')}
                body={t('help.onboarding.ready.body')}
                footer={
                  <>
                    <button onClick={() => finish(false)} className={BUTTON_SECONDARY}>
                      {t('help.onboarding.ready.explore')}
                    </button>
                    <button onClick={() => finish(true)} data-testid='onboarding-tour' className={BUTTON_PRIMARY}>
                      {t('help.onboarding.ready.tour')}
                    </button>
                  </>
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

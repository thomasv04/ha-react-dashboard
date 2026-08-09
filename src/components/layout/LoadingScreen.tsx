import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/** Étapes du démarrage, dans l'ordre. */
export type BootStage = 'connect' | 'config' | 'widgets';

const STAGES: BootStage[] = ['connect', 'config', 'widgets'];

/** Au-delà, on suppose que l'étape est bloquée et on propose une issue. */
const STUCK_AFTER_MS = 7_000;

interface LoadingScreenProps {
  /** Étape en cours */
  stage: BootStage;
  /** Proposé quand le démarrage semble bloqué (affichage dégradé) */
  onSkip?: () => void;
}

/**
 * Écran de démarrage.
 *
 * Trois principes :
 *
 * 1. **Il dit où on en est.** Un spinner nu ne distingue pas « ça arrive » de
 *    « c'est mort ». Les trois étapes sont listées et cochées au fur et à mesure.
 * 2. **Il ne bloque jamais indéfiniment.** Passé {@link STUCK_AFTER_MS} sur la
 *    même étape, il l'annonce et propose de continuer en mode dégradé.
 * 3. **Il ressemble déjà au dashboard.** Même fond, même verre : pas de flash
 *    blanc ni de rupture visuelle au moment où le dashboard prend la main.
 */
export function LoadingScreen({ stage, onSkip }: LoadingScreenProps) {
  const { t } = useI18n();
  const [stuck, setStuck] = useState(false);
  const currentIndex = STAGES.indexOf(stage);

  // Le compteur repart à chaque changement d'étape : c'est l'absence de
  // *progrès* qui est suspecte, pas la durée totale.
  useEffect(() => {
    setStuck(false);
    const timer = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    // Fond transparent : `BackgroundLayer` est monté en amont et peint déjà la
    // nappe ambiante du thème. Poser ici un fond opaque le masquait — et
    // provoquait un changement de fond au moment où le dashboard prend la main.
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/35' role='status' aria-live='polite'>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className='gc rounded-3xl w-full max-w-sm px-6 py-7 flex flex-col items-center gap-6'
      >
        {/* Marque animée — trois anneaux concentriques qui respirent */}
        <div className='relative w-16 h-16 shrink-0'>
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className='absolute inset-0 rounded-full border'
              style={{ borderColor: 'var(--dash-accent, #3b82f6)' }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
            />
          ))}
          <div
            className='absolute inset-[22%] rounded-full'
            style={{ background: 'var(--dash-accent, #3b82f6)', boxShadow: '0 0 24px -4px var(--dash-accent, #3b82f6)' }}
          />
        </div>

        {/* Étapes */}
        <ul className='w-full flex flex-col gap-2.5'>
          {STAGES.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s} className='flex items-center gap-3'>
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300',
                    done
                      ? 'bg-green-500/15 border-green-500/30 text-green-400'
                      : active
                        ? 'bg-white/10 border-white/20 text-white/80'
                        : 'bg-white/5 border-white/8 text-white/25'
                  )}
                >
                  {done ? (
                    <Check size={13} />
                  ) : active ? (
                    <Loader2 size={13} className='animate-spin' />
                  ) : (
                    <span className='text-[10px]'>{i + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-sm transition-colors duration-300',
                    done ? 'text-white/50' : active ? 'text-white font-medium' : 'text-white/30'
                  )}
                >
                  {t(`dashboard.boot.${s}`)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Issue de secours — n'apparaît que si l'étape stagne */}
        {stuck && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className='w-full flex flex-col items-center gap-3 overflow-hidden'
          >
            <div className='flex items-start gap-2 text-amber-300/80 text-xs leading-snug'>
              <TriangleAlert size={14} className='shrink-0 mt-0.5' />
              <span>{t('dashboard.boot.slow')}</span>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className='gc-btn w-full h-11 rounded-2xl text-sm font-semibold text-white/85 active:scale-[0.98] transition-transform'
              >
                {t('dashboard.boot.continueOffline')}
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

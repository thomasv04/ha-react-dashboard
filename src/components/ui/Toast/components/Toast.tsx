import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast, type Toast, type ToastAction } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

// ── Single toast card ─────────────────────────────────────────────────────────

interface ToastCardProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const { t } = useI18n();
  const variantClass: Record<NonNullable<ToastAction['variant']>, string> = {
    default: 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]',
    primary: 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]',
    danger: 'bg-[var(--ds-alert)] text-white',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      role='status'
      // Le gabarit des feuilles Echo, comme les modales : fond de feuille, grands coins, cibles au doigt.
      className='w-full max-w-md rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet)] p-5 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
    >
      <div className='flex items-start gap-4'>
        {/* Icon */}
        {toast.icon && <div className='flex-shrink-0 mt-0.5 text-[var(--ds-ink)]'>{toast.icon}</div>}

        {/* Body */}
        <div className='flex-1 min-w-0'>
          <p className='pt-1 text-[17px] font-semibold leading-snug'>{toast.title}</p>
          {toast.description && <p className='mt-1 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{toast.description}</p>}

          {/* Progress bar for auto-dismiss */}
          {!toast.persistent && (
            <div className='mt-3 h-1 overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.durationMs ?? 5000) / 1000, ease: 'linear' }}
                // La piste et le remplissage avaient la même couleur : la durée restante ne se voyait pas.
                className='h-full rounded-full bg-[var(--ds-accent)]'
              />
            </div>
          )}

          {/* Action buttons */}
          {toast.actions && toast.actions.length > 0 && (
            <div className='mt-4 flex flex-wrap gap-2'>
              {toast.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    action.onClick();
                    onDismiss();
                  }}
                  className={cn('h-11 rounded-full px-5 text-[15px] font-semibold', variantClass[action.variant ?? 'default'])}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          aria-label={t('common.close')}
          className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Toast container ───────────────────────────────────────────────────────────

export { ToastCard };
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className='fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none'>
      <AnimatePresence mode='popLayout'>
        {toasts.map(toast => (
          <div key={toast.id} className='pointer-events-auto w-full max-w-md'>
            <ToastCard toast={toast} onDismiss={() => removeToast(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

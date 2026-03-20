import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast, type Toast, type ToastAction } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

// ── Single toast card ─────────────────────────────────────────────────────────

interface ToastCardProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const variantClass: Record<NonNullable<ToastAction['variant']>, string> = {
    default: 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white',
    primary: 'bg-blue-500/80 hover:bg-blue-500 text-white',
    danger: 'bg-red-500/80 hover:bg-red-500 text-white',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className='gc rounded-2xl p-4 w-full max-w-sm shadow-2xl'
    >
      <div className='flex items-start gap-3'>
        {/* Icon */}
        {toast.icon && <div className='flex-shrink-0 mt-0.5 text-white/70'>{toast.icon}</div>}

        {/* Body */}
        <div className='flex-1 min-w-0'>
          <p className='text-white font-semibold text-sm leading-snug'>{toast.title}</p>
          {toast.description && <p className='text-white/50 text-xs mt-0.5 leading-relaxed'>{toast.description}</p>}

          {/* Progress bar for auto-dismiss */}
          {!toast.persistent && (
            <div className='mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden'>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.durationMs ?? 5000) / 1000, ease: 'linear' }}
                className='h-full bg-white/30 rounded-full'
              />
            </div>
          )}

          {/* Action buttons */}
          {toast.actions && toast.actions.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-3'>
              {toast.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    action.onClick();
                    onDismiss();
                  }}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all', variantClass[action.variant ?? 'default'])}
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
          className='flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors'
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Toast container ───────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className='fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none'>
      <AnimatePresence mode='popLayout'>
        {toasts.map(toast => (
          <div key={toast.id} className='pointer-events-auto w-full max-w-sm'>
            <ToastCard toast={toast} onDismiss={() => removeToast(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

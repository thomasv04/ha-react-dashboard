import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useModal, type Modal, type ModalAction } from '@/context/ModalContext';
import { cn } from '@/lib/utils';

// Safe content renderer
function ModalContentRenderer({ content }: { content: Modal['content'] }) {
  if (!content) return null;

  // Plain string
  if (typeof content === 'string') {
    return <p className='text-white/80 text-sm leading-relaxed whitespace-pre-wrap'>{content}</p>;
  }

  // Structured content with type
  if (typeof content === 'object' && 'type' in content && 'value' in content) {
    const { type, value } = content;

    if (type === 'plain') {
      return <p className='text-white/80 text-sm leading-relaxed whitespace-pre-wrap'>{value}</p>;
    }

    if (type === 'html') {
      // For HTML, we recommend receiving pre-sanitized content from HA
      // DO NOT use dangerouslySetInnerHTML with unsanitized user input
      return (
        <div
          className='text-white/80 text-sm leading-relaxed prose prose-invert prose-sm max-w-none'
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );
    }

    if (type === 'markdown') {
      // For markdown, recommend using marked + DOMPurify
      // Installation: npm install marked dompurify @types/dompurify
      // For now, fallback to plain text with a note
      return (
        <div className='text-white/80 text-sm leading-relaxed'>
          <p className='text-yellow-400/80 text-xs mb-2'>
            ⚠️ Markdown rendering requires 'marked' + 'dompurify' libraries
          </p>
          <pre className='whitespace-pre-wrap font-sans'>{value}</pre>
        </div>
      );
    }
  }

  // ReactNode
  return <div className='text-white/80 text-sm'>{content}</div>;
}

// Single modal card
interface ModalCardProps {
  modal: Modal;
  onClose: () => void;
}

function ModalCard({ modal, onClose }: ModalCardProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    full: 'max-w-[90vw]',
  }[modal.width ?? 'md'];

  const variantClass: Record<NonNullable<ModalAction['variant']>, string> = {
    default: 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white',
    primary: 'bg-blue-500/80 hover:bg-blue-500 text-white',
    danger: 'bg-red-500/80 hover:bg-red-500 text-white',
  };

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.dismissible) {
        onClose();
      }
    },
    [modal.dismissible, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    modalElement.addEventListener('keydown', handleTabKey as any);
    return () => modalElement.removeEventListener('keydown', handleTabKey as any);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className='fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
      onClick={modal.dismissible ? onClose : undefined}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className={cn('gc rounded-3xl p-6 w-full shadow-2xl', widthClass)}
        role='dialog'
        aria-modal='true'
        aria-labelledby={modal.title ? 'modal-title' : undefined}
      >
        {/* Header */}
        <div className='flex items-start justify-between mb-4'>
          {modal.title && (
            <h2 id='modal-title' className='text-white font-bold text-lg pr-8'>
              {modal.title}
            </h2>
          )}
          {modal.dismissible && (
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className='flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors ml-auto'
            aria-label='Fermer'
          >
            <X size={16} />
          </button>
          )}
        </div>

        {/* Content */}
        {modal.content && (
          <div className='mb-6 max-h-[60vh] overflow-y-auto'>
            <ModalContentRenderer content={modal.content} />
          </div>
        )}

        {/* Actions */}
        {modal.actions && modal.actions.length > 0 && (
          <div className='flex flex-wrap gap-2 justify-end'>
            {modal.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  // Close modal if action explicitly requests it, or
                  // if modal is not persistent (existing behaviour).
                  if (action.closeOnClick || !modal.persistent) {
                    onClose();
                  }
                }}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  variantClass[action.variant ?? 'default']
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Modal container (portal)
export function ModalContainer() {
  const { modals, closeModal } = useModal();

  return createPortal(
    <AnimatePresence mode='wait'>
      {modals.map(modal => (
        <ModalCard key={modal.id} modal={modal} onClose={() => closeModal(modal.id)} />
      ))}
    </AnimatePresence>,
    document.body
  );
}
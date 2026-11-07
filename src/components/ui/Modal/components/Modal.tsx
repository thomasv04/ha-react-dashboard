import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { modalEnter, modalScrim, topSheet } from '@/lib/motion-variants';
import { X } from 'lucide-react';
import { useModal, type Modal, type ModalAction } from '@/context/ModalContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { RichText } from '@/components/ui/RichText';

const TEXT_CLASS = 'text-[var(--ds-ink)] text-base leading-relaxed whitespace-pre-wrap';
const HTML_CLASS = 'text-[var(--ds-ink)] text-base leading-relaxed prose prose-invert max-w-none';

// Safe content renderer — l'assainissement du HTML vit dans `RichText`.
function ModalContentRenderer({ content }: { content: Modal['content'] }) {
  if (!content) return null;

  // Plain string
  if (typeof content === 'string') {
    return <RichText value={content} className={TEXT_CLASS} />;
  }

  // Structured content with type
  if (typeof content === 'object' && 'type' in content && 'value' in content) {
    const { type, value } = content;
    return <RichText type={type} value={value} className={type === 'html' ? HTML_CLASS : TEXT_CLASS} />;
  }

  // ReactNode
  return <div className='text-[var(--ds-ink)] text-base'>{content as React.ReactNode}</div>;
}

// Single modal card
interface ModalCardProps {
  modal: Modal;
  onClose: () => void;
}

function ModalCard({ modal, onClose }: ModalCardProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    full: 'max-w-[90vw]',
  }[modal.width === 'screen' ? 'md' : (modal.width ?? 'md')];
  const screen = modal.width === 'screen';

  const variantClass: Record<NonNullable<ModalAction['variant']>, string> = {
    default: 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]',
    primary: 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]',
    danger: 'bg-[var(--ds-alert)] text-white',
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

    modalElement.addEventListener('keydown', handleTabKey as EventListener);
    return () => modalElement.removeEventListener('keydown', handleTabKey as EventListener);
  }, []);

  const closeButton = modal.dismissible && (
    <button
      ref={firstFocusableRef}
      onClick={onClose}
      className='ml-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
      aria-label={t('common.close')}
    >
      <X size={18} />
    </button>
  );

  const actions = modal.actions && modal.actions.length > 0 && (
    <div className='flex flex-wrap gap-2 justify-end'>
      {modal.actions.map((action, i) => (
        <button
          key={i}
          onClick={() => {
            action.onClick();
            // Une action ferme toujours sa fenêtre : `dismissible: false`
            // la garde ouverte jusque-là, rien d'autre.
            onClose();
          }}
          className={cn('h-12 rounded-full px-6 text-base font-semibold', variantClass[action.variant ?? 'default'])}
        >
          {action.label}
        </button>
      ))}
    </div>
  );

  // Plein écran : la feuille des modales du dashboard (`Panel`) — poignée et
  // titre centrés, croix en haut à droite, contenu dans un panneau.
  if (screen) {
    return (
      <motion.div
        ref={modalRef}
        variants={topSheet}
        initial='hidden'
        animate='visible'
        exit='exit'
        role='dialog'
        aria-modal='true'
        aria-labelledby={modal.title ? 'modal-title' : undefined}
        className='fixed inset-0 z-[200] flex flex-col bg-[var(--ds-ground)] text-[var(--ds-ink)]'
      >
        <div aria-hidden='true' className='mx-auto mt-4 h-[5px] w-20 shrink-0 rounded-full bg-[var(--ds-ink-muted)]' />
        {modal.title && (
          <h2 id='modal-title' className='shrink-0 truncate px-20 pt-5 text-center text-2xl font-semibold sm:px-56'>
            {modal.title}
          </h2>
        )}
        <div className='absolute right-6 top-6 flex items-center gap-2'>
          {/* Le temps qui reste avant la fermeture, comme sur une modale du dashboard. */}
          {modal.durationMs && (
            <div className='h-1.5 w-16 overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: modal.durationMs / 1000, ease: 'linear' }}
                className='h-full rounded-full bg-[var(--ds-ink-muted)]'
              />
            </div>
          )}
          {closeButton}
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-10'>
          <div className='mx-auto max-w-[1200px] rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-[22px]'>
            {modal.content && (
              <div className={cn(actions && 'mb-6')}>
                <ModalContentRenderer content={modal.content} />
              </div>
            )}
            {actions}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={modalScrim}
      initial='hidden'
      animate='visible'
      exit='exit'
      data-overlay
      className='fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45'
      onClick={modal.dismissible ? onClose : undefined}
    >
      <motion.div
        ref={modalRef}
        variants={modalEnter}
        initial='hidden'
        animate='visible'
        exit='exit'
        onClick={e => e.stopPropagation()}
        // Le gabarit des feuilles Echo : fond bleu de feuille, grands coins, cibles au doigt.
        className={cn(
          'w-full rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] p-[26px] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]',
          widthClass
        )}
        role='dialog'
        aria-modal='true'
        aria-labelledby={modal.title ? 'modal-title' : undefined}
      >
        {/* Header */}
        <div className='mb-4 flex items-start justify-between gap-3'>
          {modal.title && (
            <h2 id='modal-title' className='text-[22px] font-bold leading-tight'>
              {modal.title}
            </h2>
          )}
          {closeButton}
        </div>

        {/* Content */}
        {modal.content && (
          <div className='mb-6 max-h-[60vh] overflow-y-auto'>
            <ModalContentRenderer content={modal.content} />
          </div>
        )}

        {actions}
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

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowUp, Mic, RotateCcw, Sparkles } from 'lucide-react';
import { Sheet } from '@/components/ds/Sheet';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useAssist, type AssistMessage } from './useAssist';

const SUGGESTIONS = ['lights', 'temperature', 'lightsOff'] as const;

/**
 * Assist : la conversation avec l'assistant de Home Assistant, dans une feuille
 * à droite comme les réglages d'un appareil. Le fil vit dans ce composant, que
 * le lanceur garde monté : fermer la feuille ne perd pas la conversation.
 *
 * Pas de reconnaissance vocale dans cette version : le micro est là pour la
 * place qu'il prendra, mais désactivé (voir `docs/ASSIST.md`).
 */
export function AssistSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { messages, pending, send, reset } = useAssist();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Suit la conversation : la dernière bulle reste visible.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, pending]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || pending) return;
    void send(draft);
    setDraft('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('layout.assist.title')}
      subtitle={t('layout.assist.subtitle')}
      closeLabel={t('layout.assist.close')}
    >
      <div data-testid='assist' className='flex min-h-0 flex-1 flex-col gap-3'>
        {messages.length > 0 && (
          <button
            type='button'
            onClick={reset}
            className='flex h-9 items-center gap-2 self-end rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold'
          >
            <RotateCcw size={14} aria-hidden='true' />
            {t('layout.assist.newConversation')}
          </button>
        )}

        <div role='log' aria-live='polite' className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto'>
          {messages.length === 0 ? (
            <div className='my-auto flex flex-col items-center gap-4 text-center'>
              <span className='flex size-14 items-center justify-center rounded-full bg-[var(--ds-accent)] text-white'>
                <Sparkles size={26} aria-hidden='true' />
              </span>
              <div>
                <p className='text-lg font-bold'>{t('layout.assist.emptyTitle')}</p>
                <p className='text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.assist.emptyHint')}</p>
              </div>
              <ul aria-label={t('layout.assist.suggestionsLabel')} className='flex w-full flex-col gap-2'>
                {SUGGESTIONS.map(key => (
                  <li key={key}>
                    <button
                      type='button'
                      onClick={() => void send(t(`layout.assist.suggestions.${key}`))}
                      className='w-full rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] px-4 py-3 text-left text-[15px] font-semibold'
                    >
                      {t(`layout.assist.suggestions.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map(message => <Bubble key={message.id} message={message} />)
          )}
          {pending && (
            <p role='status' className='text-sm font-semibold text-[var(--ds-ink-muted)]'>
              {t('layout.assist.thinking')}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className='flex items-center gap-2'>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            aria-label={t('layout.assist.inputLabel')}
            placeholder={t('layout.assist.placeholder')}
            autoComplete='off'
            className='h-12 min-w-0 flex-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-sheet-section)] px-5 text-[15px] text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]'
          />
          {/* Reconnaissance vocale : hors de ce lot — le bouton reste, désactivé. */}
          <button
            type='button'
            disabled
            aria-label={t('layout.assist.micLabel')}
            title={t('layout.assist.micUnavailable')}
            className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] opacity-50'
          >
            <Mic size={20} aria-hidden='true' />
          </button>
          <button
            type='submit'
            disabled={!draft.trim() || pending}
            aria-label={t('layout.assist.send')}
            title={t('layout.assist.send')}
            className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ds-accent)] text-white disabled:opacity-40'
          >
            <ArrowUp size={20} aria-hidden='true' />
          </button>
        </form>
      </div>
    </Sheet>
  );
}

function Bubble({ message }: { message: AssistMessage }) {
  const { t } = useI18n();
  if (message.role === 'user') {
    return (
      <p className='max-w-[85%] self-end rounded-[var(--ds-radius-lg)] rounded-br-md bg-[var(--ds-tile-on)] px-4 py-3 text-[15px] text-[var(--ds-tile-on-ink)]'>
        {message.text}
      </p>
    );
  }
  if (message.role === 'error') {
    return (
      <div
        role='alert'
        className='flex max-w-[92%] items-start gap-3 self-start rounded-[var(--ds-radius-lg)] border-2 border-[var(--ds-alert)] bg-[var(--ds-sheet-section)] px-4 py-3 text-[15px]'
      >
        <AlertTriangle size={18} aria-hidden='true' className='mt-0.5 shrink-0 text-[var(--ds-alert)]' />
        {t(`layout.assist.errors.${message.kind}`)}
      </div>
    );
  }
  return (
    <div className='flex max-w-[92%] flex-col gap-2 self-start'>
      <p
        className={cn(
          'rounded-[var(--ds-radius-lg)] rounded-bl-md bg-[var(--ds-sheet-section)] px-4 py-3 text-[15px]',
          message.type === 'error' && 'border-2 border-[var(--ds-alert)]'
        )}
      >
        {message.text || t('layout.assist.noAnswer')}
      </p>
      {message.targets.length > 0 && (
        <ul aria-label={t('layout.assist.targets')} className='flex flex-wrap gap-2'>
          {message.targets.map(target => (
            <li
              key={target.id ?? target.name}
              className='rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-3 py-1.5 text-sm font-semibold'
            >
              {target.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

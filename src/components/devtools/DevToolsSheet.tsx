import { useState, type ReactNode } from 'react';
import { useHass } from '@hakit/core';
import { Eye, Send } from 'lucide-react';
import { Sheet } from '@/components/ds/Sheet';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, Segmented } from '@/components/layout/ThemeControlsModal/controls';
import { PerfToggle } from '@/components/layout/ThemeControlsModal/PerfToggle';
import { SETTINGS_CARD } from '@/components/layout/ThemeControlsModal/typography';
import { Snippet } from '@/components/onboarding/EventsDoc';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  applyNotificationEvent,
  HA_EVENT_TYPES,
  modalFromEvent,
  toastFromEvent,
  type HAModalEvent,
  type HANotificationEvent,
  type HAToastEvent,
} from '@/lib/ha-events';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { automationYaml, buildEventData, DEFAULT_FORM, type EventForm, type EventKind } from './event-data';

type Status = { kind: 'sent' } | { kind: 'error'; message: string } | null;

/** Un intitulé et son contrôle ; `group` pour un contrôle qui n'est pas un champ (rangée de choix). */
function Field({ label, group, children }: { label: string; group?: boolean; children: ReactNode }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className='flex flex-col gap-1.5'>
      <span className='text-[15px] font-semibold text-[var(--ds-ink-muted)]'>{label}</span>
      {children}
    </Tag>
  );
}

/**
 * Outils de développement : un bac à sable pour les trois événements que le
 * dashboard écoute. On remplit un formulaire, on voit le résultat ici, on
 * l'envoie pour de vrai à tous les écrans ouverts, et on repart avec le YAML
 * de l'automatisation. Réservé aux administrateurs : Home Assistant refuse
 * `fire_event` aux autres comptes.
 */
export function DevToolsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const connection = useHass(s => s.connection);
  const helpers = useHass(s => s.helpers);
  const { openModal } = useModal();
  const { addToast } = useToast();
  const { notify, dismiss, dismissAll } = useNotifications();

  const [kind, setKind] = useState<EventKind>('modal');
  const [form, setForm] = useState<EventForm>(() => ({
    ...DEFAULT_FORM,
    title: t('help.devtools.sampleTitle'),
    text: t('help.devtools.sampleText'),
  }));
  const [status, setStatus] = useState<Status>(null);

  const set = (patch: Partial<EventForm>) => {
    setForm(f => ({ ...f, ...patch }));
    setStatus(null);
  };

  const data = buildEventData(kind, form);
  const canSend = !!(form.title.trim() || form.text.trim());

  /** Ce qu'afficherait l'événement, sur cet écran seulement — mêmes fonctions que les abonnements. */
  const preview = () => {
    if (kind === 'modal') openModal(modalFromEvent(data as HAModalEvent, helpers));
    else if (kind === 'toast') addToast(toastFromEvent(data as unknown as HAToastEvent, helpers));
    else applyNotificationEvent(data as HANotificationEvent, { notify, dismiss, dismissAll });
  };

  const send = async () => {
    if (!connection) return;
    try {
      await connection.sendMessagePromise({ type: 'fire_event', event_type: HA_EVENT_TYPES[kind], event_data: data });
      setStatus({ kind: 'sent' });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as { message?: string })?.message ?? String(err) });
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('help.devtools.title')}
      subtitle={t('help.devtools.subtitle')}
      closeLabel={t('common.close')}
    >
      <div data-testid='devtools-sheet' className='flex flex-col gap-4'>
        <Segmented
          label={t('help.devtools.kind')}
          value={kind}
          onChange={k => {
            setKind(k);
            setStatus(null);
          }}
          options={(['modal', 'toast', 'notification'] as const).map(k => ({ value: k, label: t(`help.devtools.kinds.${k}`) }))}
        />
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t(`help.events.${kind}Desc`)}</p>

        <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
          {kind === 'notification' && (
            <Field label={t('help.devtools.id')}>
              <input className={INPUT} value={form.id} onChange={e => set({ id: e.target.value })} placeholder='update-2.3.0' />
            </Field>
          )}
          <Field label={t('help.devtools.fieldTitle')}>
            <input className={INPUT} value={form.title} onChange={e => set({ title: e.target.value })} />
          </Field>
          <Field label={t('help.devtools.text')}>
            <textarea
              rows={3}
              className={cn(INPUT, 'h-auto py-3 leading-relaxed')}
              value={form.text}
              onChange={e => set({ text: e.target.value })}
            />
          </Field>

          {kind === 'modal' && (
            <Field group label={t('help.devtools.width')}>
              <Segmented
                label={t('help.devtools.width')}
                value={form.width}
                onChange={width => set({ width })}
                options={(['sm', 'md', 'lg', 'full'] as const).map(w => ({ value: w, label: t(`help.devtools.widths.${w}`) }))}
              />
            </Field>
          )}
          {kind === 'notification' && (
            <Field group label={t('help.devtools.level')}>
              <Segmented
                label={t('help.devtools.level')}
                value={form.level}
                onChange={level => set({ level })}
                options={(['info', 'success', 'warning', 'error'] as const).map(l => ({ value: l, label: t(`help.devtools.levels.${l}`) }))}
              />
            </Field>
          )}
          {kind === 'toast' && !form.persistent && (
            <Field label={t('help.devtools.duration', { value: form.durationS })}>
              <input
                type='range'
                min={2}
                max={30}
                value={form.durationS}
                onChange={e => set({ durationS: Number(e.target.value) })}
                className='h-8 w-full accent-[var(--ds-accent)]'
              />
            </Field>
          )}
        </section>

        {kind !== 'toast' && (
          <PerfToggle
            checked={form.html}
            onChange={html => set({ html })}
            label={t('help.devtools.html')}
            description={t('help.devtools.htmlDesc')}
          />
        )}
        {kind === 'modal' && (
          <PerfToggle
            checked={!form.dismissible}
            onChange={locked => set({ dismissible: !locked })}
            label={t('help.devtools.locked')}
            description={t('help.devtools.lockedDesc')}
          />
        )}
        {kind === 'toast' && (
          <PerfToggle
            checked={form.persistent}
            onChange={persistent => set({ persistent })}
            label={t('help.devtools.persistent')}
            description={t('help.devtools.persistentDesc')}
          />
        )}

        <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
          <h3 className='text-lg font-semibold'>{t('help.devtools.action')}</h3>
          <Field label={t('help.devtools.actionLabel')}>
            <input className={INPUT} value={form.actionLabel} onChange={e => set({ actionLabel: e.target.value })} />
          </Field>
          <Field label={t('help.devtools.actionService')}>
            <input
              className={INPUT}
              value={form.actionService}
              onChange={e => set({ actionService: e.target.value })}
              placeholder='light.toggle'
            />
          </Field>
          <Field label={t('help.devtools.actionEntity')}>
            <input
              className={INPUT}
              value={form.actionEntity}
              onChange={e => set({ actionEntity: e.target.value })}
              placeholder='light.salon'
            />
          </Field>
        </section>

        <div className='flex flex-wrap gap-2'>
          <button onClick={preview} disabled={!canSend} data-testid='devtools-preview' className={cn(BUTTON_SECONDARY, 'flex-1')}>
            <Eye size={18} /> {t('help.devtools.preview')}
          </button>
          <button onClick={send} disabled={!canSend || !connection} data-testid='devtools-send' className={cn(BUTTON_PRIMARY, 'flex-1')}>
            <Send size={18} /> {t('help.devtools.send')}
          </button>
        </div>
        {kind === 'notification' && <p className='text-[15px] text-[var(--ds-ink-muted)]'>{t('help.devtools.notificationHint')}</p>}
        {status && (
          <p
            role='status'
            className={cn('text-[15px] font-semibold', status.kind === 'sent' ? 'text-[var(--ds-good)]' : 'text-[var(--ds-alert)]')}
          >
            {status.kind === 'sent' ? t('help.devtools.sent') : t('help.devtools.failed', { value: status.message })}
          </p>
        )}

        <Snippet automation={automationYaml(kind, data)} eventType={HA_EVENT_TYPES[kind]} />
      </div>
    </Sheet>
  );
}

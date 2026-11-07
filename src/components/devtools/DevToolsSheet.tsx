import { useState, type ReactNode } from 'react';
import { useHass } from '@hakit/core';
import { Bell, BellOff, Eye, Send } from 'lucide-react';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { PRESETS } from '@/lib/sounds';
import { Sheet } from '@/components/ds/Sheet';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT, Segmented } from '@/components/layout/ThemeControlsModal/controls';
import { PerfToggle } from '@/components/layout/ThemeControlsModal/PerfToggle';
import { SETTINGS_CARD } from '@/components/layout/ThemeControlsModal/typography';
import { Snippet } from '@/components/onboarding/EventsDoc';
import { useTheme } from '@/context/ThemeContext';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationCard } from '@/components/wallpanel/NotificationSheet';
import { useIconCatalog } from '@/lib/lucide-icon-map';
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
import { ActionsEditor } from './ActionsEditor';
import { automationYaml, buildEventData, canSendEvent, DEFAULT_FORM, type ContentType, type EventForm, type EventKind } from './event-data';

/** Les préréglages de son, tels que le code les nomme (`sound: success`). */
const SOUND_PRESETS = Object.keys(PRESETS);

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
  const { notifications, notify, dismiss, dismissAll } = useNotifications();
  const { soundSettings } = useTheme();
  // Les icônes hors du noyau arrivent avec le catalogue, chargé à la demande.
  useIconCatalog();

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
  const canSend = canSendEvent(kind, form);
  const dismissing = kind === 'notification' && form.dismiss;

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

        {kind === 'notification' && (
          <PerfToggle
            checked={form.dismiss}
            onChange={dismiss => set({ dismiss })}
            label={t('help.devtools.dismiss')}
            description={t('help.devtools.dismissDesc')}
          />
        )}

        {dismissing ? (
          <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
            <Field label={t('help.devtools.id')}>
              <input className={INPUT} value={form.id} onChange={e => set({ id: e.target.value })} placeholder='update-2.3.0' />
            </Field>
            <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('help.devtools.dismissHint')}</p>
          </section>
        ) : (
          <>
            <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
              {kind === 'notification' && (
                <Field label={t('help.devtools.id')}>
                  <input className={INPUT} value={form.id} onChange={e => set({ id: e.target.value })} placeholder='update-2.3.0' />
                </Field>
              )}
              <Field label={t('help.devtools.fieldTitle')}>
                <input className={INPUT} value={form.title} onChange={e => set({ title: e.target.value })} />
              </Field>
              <Field label={t(kind === 'toast' ? 'help.devtools.description' : 'help.devtools.text')}>
                <textarea
                  rows={3}
                  className={cn(INPUT, 'h-auto py-3 leading-relaxed')}
                  value={form.text}
                  onChange={e => set({ text: e.target.value })}
                />
              </Field>

              {kind !== 'toast' && (
                <Field group label={t('help.devtools.contentType')}>
                  <Segmented<ContentType>
                    label={t('help.devtools.contentType')}
                    value={form.contentType}
                    onChange={contentType => set({ contentType })}
                    options={(['plain', 'html', 'markdown'] as const).map(c => ({ value: c, label: t(`help.devtools.contentTypes.${c}`) }))}
                  />
                  <span className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>
                    {t(`help.devtools.contentTypesDesc.${form.contentType}`)}
                  </span>
                </Field>
              )}

              {kind === 'modal' && (
                <>
                  {form.width !== 'screen' && (
                    <Field group label={t('help.devtools.width')}>
                      <Segmented
                        label={t('help.devtools.width')}
                        value={form.width}
                        onChange={width => set({ width })}
                        options={(['sm', 'md', 'lg', 'full'] as const).map(w => ({ value: w, label: t(`help.devtools.widths.${w}`) }))}
                      />
                    </Field>
                  )}
                  <Field group label={t('help.devtools.modalDurationMs')}>
                    <input
                      type='number'
                      min={0}
                      step={1000}
                      aria-label={t('help.devtools.modalDurationMs')}
                      className={INPUT}
                      value={form.modalDurationMs}
                      onChange={e => set({ modalDurationMs: Math.max(0, Number(e.target.value)) })}
                    />
                    <span className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('help.devtools.modalDurationDesc')}</span>
                  </Field>
                </>
              )}
              {kind === 'notification' && (
                <>
                  <Field group label={t('help.devtools.level')}>
                    <Segmented
                      label={t('help.devtools.level')}
                      value={form.level}
                      onChange={level => set({ level })}
                      options={(['info', 'success', 'warning', 'error'] as const).map(l => ({
                        value: l,
                        label: t(`help.devtools.levels.${l}`),
                      }))}
                    />
                  </Field>
                  <IconPicker value={form.icon} onChange={icon => set({ icon })} label={t('help.devtools.icon')} />
                </>
              )}
              {kind === 'toast' && (
                <Field label={t('help.devtools.durationMs')}>
                  <input
                    type='number'
                    min={500}
                    step={500}
                    disabled={form.persistent}
                    className={cn(INPUT, form.persistent && 'opacity-40')}
                    value={form.durationMs}
                    onChange={e => set({ durationMs: Number(e.target.value) })}
                  />
                </Field>
              )}
            </section>

            {kind === 'modal' && (
              <>
                <PerfToggle
                  checked={form.width === 'screen'}
                  onChange={on => set({ width: on ? 'screen' : 'md' })}
                  label={t('help.devtools.fullscreen')}
                  description={t('help.devtools.fullscreenDesc')}
                />
                <PerfToggle
                  checked={!form.dismissible}
                  onChange={locked => set({ dismissible: !locked })}
                  label={t('help.devtools.locked')}
                  description={t('help.devtools.lockedDesc')}
                />
                {/* Bloquante sans bouton : rien ne la ferme, pas même Échap. */}
                {!form.dismissible && !form.actions.some(a => a.label.trim()) && (
                  <p role='note' className='text-[15px] leading-relaxed text-[var(--ds-warm-light)]'>
                    {t('help.devtools.lockedNoAction')}
                  </p>
                )}
              </>
            )}
            {kind === 'toast' && (
              <PerfToggle
                checked={form.persistent}
                onChange={persistent => set({ persistent })}
                label={t('help.devtools.persistent')}
                description={t('help.devtools.persistentDesc')}
              />
            )}

            {kind !== 'notification' && (
              <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
                <Field label={t('help.devtools.sound')}>
                  <select className={INPUT} value={form.sound} onChange={e => set({ sound: e.target.value })}>
                    <option value='default'>{t('help.devtools.sounds.default')}</option>
                    <option value='muted'>{t('help.devtools.sounds.muted')}</option>
                    {SOUND_PRESETS.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value='url'>{t('help.devtools.sounds.url')}</option>
                  </select>
                </Field>
                {form.sound === 'url' && (
                  <Field label={t('help.devtools.soundUrl')}>
                    <input
                      className={INPUT}
                      value={form.soundUrl}
                      onChange={e => set({ soundUrl: e.target.value })}
                      placeholder='/local/sonnette.mp3'
                    />
                  </Field>
                )}
                {/* Le son d'un événement suit le réglage de l'appareil : coupé par défaut. */}
                {!soundSettings.enabled && form.sound !== 'muted' && (
                  <p role='note' className='text-[15px] leading-relaxed text-[var(--ds-warm-light)]'>
                    {t('help.devtools.soundOff')}
                  </p>
                )}
              </section>
            )}

            <ActionsEditor actions={form.actions} onChange={actions => set({ actions })} withKeep={kind === 'notification'} />
          </>
        )}

        <div className='flex flex-wrap gap-2'>
          <button onClick={preview} disabled={!canSend} data-testid='devtools-preview' className={cn(BUTTON_SECONDARY, 'flex-1')}>
            <Eye size={18} /> {t('help.devtools.preview')}
          </button>
          <button onClick={send} disabled={!canSend || !connection} data-testid='devtools-send' className={cn(BUTTON_PRIMARY, 'flex-1')}>
            <Send size={18} /> {t('help.devtools.send')}
          </button>
        </div>
        {status && (
          <p
            role='status'
            className={cn('text-[15px] font-semibold', status.kind === 'sent' ? 'text-[var(--ds-good)]' : 'text-[var(--ds-alert)]')}
          >
            {status.kind === 'sent' ? t('help.devtools.sent') : t('help.devtools.failed', { value: status.message })}
          </p>
        )}

        {/* Une notification ne s'affiche pas à l'écran : elle entre dans le tiroir de
            l'écran de veille. On montre ici ce tiroir, tel qu'il est — c'est le
            seul endroit où l'on voit l'effet d'un aperçu ou d'un envoi. */}
        {kind === 'notification' && (
          <section
            aria-label={t('help.devtools.drawer')}
            data-testid='devtools-drawer'
            className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}
          >
            <div className='flex items-center justify-between gap-3'>
              <h3 className='flex items-center gap-2 text-lg font-semibold'>
                <Bell size={20} /> {t('help.devtools.drawer')}
              </h3>
              {notifications.length > 0 && (
                <button onClick={dismissAll} className='h-10 rounded-full bg-[var(--ds-surface-3)] px-4 text-sm font-semibold'>
                  {t('layout.wallPanel.gestures.dismissAll')}
                </button>
              )}
            </div>
            <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('help.devtools.drawerHint')}</p>
            {notifications.map(item => (
              <NotificationCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
            ))}
            {notifications.length === 0 && (
              <div className='flex items-center gap-2 py-3 text-[var(--ds-ink-muted)]'>
                <BellOff size={20} /> <span className='text-[15px]'>{t('layout.wallPanel.gestures.noNotifications')}</span>
              </div>
            )}
          </section>
        )}

        <Snippet automation={automationYaml(kind, data)} eventType={HA_EVENT_TYPES[kind]} />
      </div>
    </Sheet>
  );
}

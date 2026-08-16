import { useState } from 'react';
import { Copy, Check, Eye } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { useNotifications } from '@/context/NotificationContext';

const MODAL_YAML = `action:
  - event: ha_dashboard_modal
    event_data:
      title: "Mise à jour disponible"
      content: "Une nouvelle version est prête à être installée."
      content_type: plain        # plain | html (assaini) | markdown (brut)
      width: md                  # sm | md | lg | full
      persistent: true           # reste jusqu'à une action
      dismissible: false         # ni Échap ni clic extérieur
      actions:
        - label: "Installer"
          variant: primary
          service: hassio.addon_update
          service_data:
            addon: ha-react-dashboard
        - label: "Plus tard"`;

const TOAST_YAML = `action:
  - event: ha_dashboard_toast
    event_data:
      title: "Le courrier est arrivé !"
      description: "Capteur boîte aux lettres déclenché"
      duration_ms: 8000          # défaut 5000
      persistent: false
      sound: notification        # ou false pour couper
      actions:
        - label: "Voir la sonnette"
          service: input_boolean.turn_on
          service_data:
            entity_id: input_boolean.show_camera_sonnette`;

const NOTIFICATION_YAML = `action:
  - event: ha_dashboard_notification
    event_data:
      id: update-2.3.0           # même id = remplace ; absent = nouvelle entrée
      title: "Mise à jour disponible"
      message: "Une nouvelle version est prête à être installée."
      content_type: plain        # plain | html (assaini) | markdown (brut)
      level: info                # info | success | warning | error
      icon: Download             # nom d'icône lucide
      actions:
        - label: "Installer"
          variant: primary
          service: hassio.addon_update
          service_data:
            addon: ha-react-dashboard
        - label: "Plus tard"

# Pour la retirer depuis une automatisation :
#   event_data: { id: update-2.3.0, dismiss: true }
#   sans id : vide tout le tiroir`;

/**
 * Traduit la forme « automatisation » vers ce qu'attend Outils de
 * développement > Événements : le champ Données ne reçoit **que** le contenu de
 * `event_data`, le type d'événement allant dans son propre champ.
 *
 * Coller le bloc `action:` entier avec un type au hasard ne déclenche rien, et
 * rien ne le signale — c'est le piège que cette bascule existe pour éviter.
 */
export function toDevTools(automation: string, eventType: string): string {
  const lines = automation.split('\n');
  const start = lines.findIndex(l => l.trim() === 'event_data:');
  if (start === -1) return automation;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    // Une ligne revenue en colonne 0 (les notes de bas de bloc) sort de
    // `event_data` : tout ce qui suit ne fait plus partie des données.
    if (line.trim() !== '' && !line.startsWith('      ')) break;
    body.push(line.replace(/^ {6}/, ''));
  }

  return [`# Type d'événement : ${eventType}`, "# Données d'événement :", ...body].join('\n').trimEnd();
}

function Snippet({ automation, eventType }: { automation: string; eventType: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [devTools, setDevTools] = useState(false);

  const yaml = devTools ? toDevTools(automation, eventType) : automation;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : le YAML reste
      // sélectionnable à la main, inutile d'alerter.
    }
  };

  return (
    <div className='mt-3'>
      <div className='flex items-center justify-between gap-2 mb-1.5'>
        <div className='flex items-center gap-1'>
          {[
            { on: false, label: t('help.events.formAutomation') },
            { on: true, label: t('help.events.formDevTools') },
          ].map(({ on, label }) => (
            <button
              key={label}
              onClick={() => setDevTools(on)}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                devTools === on ? 'bg-white/15 text-white/85' : 'text-white/35 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          aria-label={t('common.copy')}
          className='flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-[10px] font-semibold transition-colors'
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? t('help.events.copied') : t('common.copy')}
        </button>
      </div>
      <pre className='overflow-x-auto rounded-lg bg-black/35 border border-white/8 p-3 text-[11px] leading-relaxed text-white/70'>
        <code>{yaml}</code>
      </pre>
    </div>
  );
}

/**
 * Documentation des événements HA que le dashboard écoute.
 *
 * Pas une visite guidée : ces événements arrivent de Home Assistant, il n'y a
 * aucun élément d'interface à mettre en avant. Ce qui se démontre, c'est le
 * résultat — d'où le bouton d'aperçu, qui déclenche localement ce que
 * l'automatisation déclencherait à distance.
 */
export function EventsDoc() {
  const { t } = useI18n();
  const { openModal } = useModal();
  const { addToast } = useToast();
  const { notify } = useNotifications();

  const previewModal = () =>
    openModal({
      title: t('help.events.demoModalTitle'),
      content: t('help.events.demoModalBody'),
      width: 'md',
      actions: [{ label: t('common.close'), onClick: () => {}, closeOnClick: true, variant: 'primary' }],
    });

  const previewToast = () =>
    addToast({
      title: t('help.events.demoToastTitle'),
      description: t('help.events.demoToastBody'),
      durationMs: 5000,
    });

  // L'aperçu dépose une vraie entrée dans le tiroir : contrairement à la modale
  // et au toast, le résultat n'est pas à l'écran mais derrière un geste.
  const previewNotification = () =>
    notify({
      id: 'preview-notification',
      title: t('help.events.demoNotificationTitle'),
      message: t('help.events.demoNotificationBody'),
      level: 'info',
    });

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-white/45 text-xs leading-relaxed'>{t('help.events.intro')}</p>

      {(
        [
          { id: 'modal', yaml: MODAL_YAML, preview: previewModal },
          { id: 'toast', yaml: TOAST_YAML, preview: previewToast },
          { id: 'notification', yaml: NOTIFICATION_YAML, preview: previewNotification },
        ] as const
      ).map(({ id, yaml, preview }) => (
        <div key={id} className='rounded-xl bg-white/[0.04] border border-white/8 p-4'>
          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <code className='text-blue-300 text-xs font-semibold'>ha_dashboard_{id}</code>
              <p className='text-white/45 text-xs mt-1 leading-relaxed'>{t(`help.events.${id}Desc`)}</p>
            </div>
            <button
              onClick={preview}
              data-testid={`events-preview-${id}`}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors text-xs font-semibold flex-shrink-0'
            >
              <Eye size={11} /> {t('help.events.preview')}
            </button>
          </div>
          <Snippet automation={yaml} eventType={`ha_dashboard_${id}`} />
        </div>
      ))}

      <p className='text-white/30 text-[11px] leading-relaxed'>{t('help.events.tip')}</p>
    </div>
  );
}

import { useState } from 'react';
import { Copy, Check, Eye } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';

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

function Snippet({ yaml }: { yaml: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

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
    <div className='relative mt-3'>
      <button
        onClick={copy}
        aria-label={t('common.copy')}
        className='absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-[10px] font-semibold transition-colors'
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? t('help.events.copied') : t('common.copy')}
      </button>
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

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-white/45 text-xs leading-relaxed'>{t('help.events.intro')}</p>

      {(
        [
          { id: 'modal', yaml: MODAL_YAML, preview: previewModal },
          { id: 'toast', yaml: TOAST_YAML, preview: previewToast },
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
          <Snippet yaml={yaml} />
        </div>
      ))}

      <p className='text-white/30 text-[11px] leading-relaxed'>{t('help.events.tip')}</p>
    </div>
  );
}

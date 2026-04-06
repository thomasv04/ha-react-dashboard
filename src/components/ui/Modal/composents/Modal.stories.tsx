import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { ModalProvider, useModal } from '@/context/ModalContext';
import { ModalContainer } from '@/components/ui/Modal/composents/Modal';

function ModalDemo({ setup }: { setup: (openModal: ReturnType<typeof useModal>['openModal']) => void }) {
  const { openModal, clearAll } = useModal();

  return (
    <div className='relative min-h-[300px] flex flex-col gap-3 items-start'>
      <button
        onClick={() => setup(openModal)}
        className='gc-inner px-4 py-2 rounded-xl text-sm text-white/80 hover:text-white transition-colors'
      >
        Ouvrir la modal
      </button>
      <button onClick={clearAll} className='text-xs text-white/30 hover:text-white/60 transition-colors'>
        Tout fermer
      </button>
      <ModalContainer />
    </div>
  );
}

const meta = {
  title: 'UI/Modal',
  decorators: [
    Story => (
      <ModalProvider>
        <div className='p-6'>
          <Story />
        </div>
      </ModalProvider>
    ),
  ],
  parameters: {
    backgrounds: { disable: true },
    docs: {
      description: {
        component:
          'Vous pouvez déclencher cette modal depuis Home Assistant en émettant l\'événement `ha_dashboard_modal` avec `event_data` suivant :\n\n```yaml\nevent: ha_dashboard_modal\nevent_data:\n  title: "Mise à jour disponible"\n  content: "Une nouvelle version de Home Assistant est disponible. Voulez-vous l\'installer maintenant?"\n  width: "md"\n  dismissible: false\n  persistent: true\n  actions:\n    - label: "Installer"\n      variant: "primary"\n      service: "hassio.addon_update"\n    - label: "Plus tard"\n      variant: "default"\n```',
        story:
          'Exemple d\'événement Home Assistant (utilisez l\'onglet Docs pour voir le YAML complet).',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleModal: Story = {
  name: 'Modal simple',
  render: () => (
    <ModalDemo
      setup={open =>
        open({
          title: 'Notification importante',
          content: 'Le système de sécurité a détecté un mouvement inhabituel.',
        })
      }
    />
  ),
};

export const WithActions: Story = {
  name: 'Modal avec actions',
  render: () => (
    <ModalDemo
      setup={open =>
        open({
          title: 'Alarme déclenchée',
          content: 'Un capteur de mouvement a été activé dans le salon.',
          actions: [
            {
              label: 'Voir les caméras',
              variant: 'primary',
              onClick: () => console.log('Opening cameras'),
            },
            {
              label: 'Désactiver',
              variant: 'danger',
              onClick: () => console.log('Disabling alarm'),
            },
            {
              label: 'Ignorer',
              variant: 'default',
              onClick: () => {},
            },
          ],
        })
      }
    />
  ),
};

export const LargeContent: Story = {
  name: 'Contenu long (scrollable)',
  render: () => (
    <ModalDemo
      setup={open =>
        open({
          title: 'Rapport de sécurité',
          width: 'lg',
          content: `Événements détectés aujourd'hui:\n\n${Array(20)
            .fill(0)
            .map((_, i) => `${i + 1}. Événement ${i + 1} - ${new Date().toLocaleTimeString()}`)
            .join('\n')}`,
        })
      }
    />
  ),
};

export const NonDismissible: Story = {
  name: 'Modal persistante (non-dismissible)',
  render: () => (
    <ModalDemo
      setup={open =>
        open({
          title: 'Action requise',
          content: 'Vous devez confirmer cette action avant de continuer.',
          dismissible: false,
          persistent: true,
          actions: [
            {
              label: 'Confirmer',
              variant: 'primary',
              onClick: () => console.log('Confirmed'),
              // Close even if modal is marked persistent/non-dismissible
              closeOnClick: true,
            },
          ],
        })
      }
    />
  ),
};

export const FromHAEvent: Story = {
  name: 'Déclenchée depuis HA (docs)',
  parameters: {
    docs: {
      story:
        'Cette story montre l\'exemple d\'événement Home Assistant `ha_dashboard_modal` — voir le composant pour le YAML complet.',
    },
  },
  render: () => (
    <ModalDemo
      setup={open =>
        open({
          title: 'Mise à jour disponible',
          content: 'Une nouvelle version de Home Assistant est disponible. Voulez-vous l\'installer maintenant?',
          width: 'md',
          dismissible: false,
          persistent: true,
          actions: [
            {
              label: 'Installer',
              variant: 'primary',
              onClick: () => console.log('Installer via service hassio.addon_update'),
            },
            {
              label: 'Plus tard',
              variant: 'default',
              onClick: () => {},
            },
          ],
        })
      }
    />
  ),
};
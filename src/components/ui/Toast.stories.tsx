import type { Meta, StoryObj } from '@storybook/react';
import { Bell, Mail, Package, AlertTriangle } from 'lucide-react';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';

// ── Storybook wrapper ─────────────────────────────────────────────────────────

function ToastDemo({ setup }: { setup: (addToast: ReturnType<typeof useToast>['addToast']) => void }) {
  const { addToast, clearAll } = useToast();
  return (
    <div className='relative min-h-[300px] flex flex-col gap-3 items-start'>
      <button
        onClick={() => setup(addToast)}
        className='gc-inner px-4 py-2 rounded-xl text-sm text-white/80 hover:text-white transition-colors'
      >
        Afficher la notification
      </button>
      <button onClick={clearAll} className='text-xs text-white/30 hover:text-white/60 transition-colors'>
        Tout effacer
      </button>
      <ToastContainer />
    </div>
  );
}

const meta = {
  title: 'UI/Toast',
  decorators: [
    Story => (
      <ToastProvider>
        <div className='p-6'>
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
  parameters: { backgrounds: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const SimpleDismiss: Story = {
  name: 'Simple auto-dismiss (5s)',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Mise à jour disponible',
          description: 'Une nouvelle version du dashboard est prête.',
          icon: <Bell size={16} />,
        })
      }
    />
  ),
};

export const CourierArrived: Story = {
  name: 'Courrier arrivé — avec actions',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Le courrier est arrivé !',
          description: 'Le capteur de boîte aux lettres a détecté une ouverture.',
          icon: <Mail size={16} className='text-blue-400' />,
          persistent: true,
          actions: [
            {
              label: 'Voir les caméras',
              variant: 'primary',
              onClick: () => console.log('open cameras'),
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

export const PackageDelivery: Story = {
  name: 'Colis livré — persistant + danger',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Colis déposé',
          description: 'Un mouvement a été détecté devant la porte.',
          icon: <Package size={16} className='text-green-400' />,
          persistent: true,
          actions: [
            {
              label: 'Voir la sonnette',
              variant: 'primary',
              onClick: () => {},
            },
            {
              label: 'Désarmer alarme',
              variant: 'danger',
              onClick: () => {},
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

export const QuickAlert: Story = {
  name: 'Alerte rapide (3s) — son alert',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Porte du garage ouverte',
          icon: <AlertTriangle size={16} className='text-yellow-400' />,
          durationMs: 3000,
          sound: 'alert',
        })
      }
    />
  ),
};

export const SuccessSound: Story = {
  name: 'Succès — son success',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Volets fermés',
          description: 'Tous les volets ont été fermés avec succès.',
          durationMs: 4000,
          sound: 'success',
        })
      }
    />
  ),
};

export const SilentToast: Story = {
  name: 'Silencieux — sound: false',
  render: () => (
    <ToastDemo
      setup={add =>
        add({
          title: 'Mise à jour silencieuse',
          description: 'Aucun son pour cette notification.',
          sound: false,
        })
      }
    />
  ),
};

export const MultipleToasts: Story = {
  name: 'Plusieurs toasts simultanés',
  render: () => (
    <ToastDemo
      setup={add => {
        add({ title: 'Courrier arrivé', icon: <Mail size={16} />, persistent: true });
        setTimeout(() => add({ title: 'Température cuisine 28°C', durationMs: 4000 }), 400);
        setTimeout(
          () => add({ title: 'Batterie solaire pleine', icon: <Bell size={16} className='text-green-400' />, durationMs: 6000 }),
          800
        );
      }}
    />
  ),
};

// ── Sound tester ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import { playSound, type SoundPreset } from '@/lib/sounds';
import { Volume2 } from 'lucide-react';

const SOUND_OPTIONS: { value: SoundPreset; label: string; description: string }[] = [
  { value: 'notification', label: 'Notification', description: 'Double ding doux (défaut)' },
  { value: 'alert', label: 'Alerte', description: 'Triple bip urgent' },
  { value: 'success', label: 'Succès', description: 'Montée harmonique' },
  { value: 'warning', label: 'Avertissement', description: 'Tonalité basse descendante' },
];

function SoundTester() {
  const [selected, setSelected] = useState<SoundPreset>('notification');
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    playSound(selected);
    setTimeout(() => setPlaying(false), 600);
  }

  return (
    <div className='flex flex-col gap-4 p-2'>
      <div className='text-white/50 text-xs uppercase tracking-wider'>Testeur de sons</div>

      {/* Options */}
      <div className='flex flex-col gap-2'>
        {SOUND_OPTIONS.map(opt => (
          <label
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
              selected === opt.value ? 'gc-inner border border-white/20' : 'border border-transparent hover:bg-white/5'
            }`}
          >
            <input
              type='radio'
              name='sound'
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className='accent-blue-400'
            />
            <div>
              <div className='text-white text-sm font-medium'>{opt.label}</div>
              <div className='text-white/40 text-xs'>{opt.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all ${
          playing ? 'bg-blue-500/60 scale-95 text-white' : 'bg-blue-500/80 hover:bg-blue-500 text-white'
        }`}
      >
        <Volume2 size={16} className={playing ? 'animate-pulse' : ''} />
        Jouer le son
      </button>
    </div>
  );
}

export const SoundPreview: Story = {
  name: '🔊 Testeur de sons',
  render: () => <SoundTester />,
};

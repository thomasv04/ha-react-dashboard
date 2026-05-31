import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { playSound, PRESETS, type SoundPreset } from '@/lib/sounds';
import { Volume2, Play } from 'lucide-react';

// ── Sound catalog ─────────────────────────────────────────────────────────────

interface SoundInfo {
  value: SoundPreset;
  label: string;
  description: string;
  category: string;
}

const SOUND_CATALOG: SoundInfo[] = [
  // Generic UI
  { value: 'notification', label: 'Notification', description: 'Double ding doux', category: 'UI générique' },
  { value: 'alert', label: 'Alerte', description: 'Triple bip urgent', category: 'UI générique' },
  { value: 'success', label: 'Succès', description: 'Montée harmonique plaisante', category: 'UI générique' },
  { value: 'warning', label: 'Avertissement', description: 'Tonalité basse descendante', category: 'UI générique' },
  { value: 'error', label: 'Erreur', description: 'Buzz dissonant descendant', category: 'UI générique' },
  { value: 'click', label: 'Click', description: 'Clic très court et discret', category: 'UI générique' },
  { value: 'pop', label: 'Pop', description: 'Bulle qui éclate', category: 'UI générique' },

  // Toggle
  { value: 'toggle_on', label: 'Toggle ON', description: 'Pip montant lumineux', category: 'Toggle' },
  { value: 'toggle_off', label: 'Toggle OFF', description: 'Pip descendant discret', category: 'Toggle' },

  // Alarm
  { value: 'arm', label: 'Armement', description: 'Bips ascendants (tension)', category: 'Alarme' },
  { value: 'disarm', label: 'Désarmement', description: 'Carillon descendant (soulagement)', category: 'Alarme' },

  // Slider
  { value: 'slider_tick', label: 'Slider tick', description: 'Tap ultra-court', category: 'Slider' },

  // Door / Lock
  { value: 'door_open', label: 'Porte ouverte', description: 'Tonalités montantes type whoosh', category: 'Porte / Serrure' },
  { value: 'door_close', label: 'Porte fermée', description: 'Descente rapide type thud', category: 'Porte / Serrure' },
  { value: 'lock', label: 'Verrouillage', description: 'Clic métallique solide', category: 'Porte / Serrure' },
  { value: 'unlock', label: 'Déverrouillage', description: 'Clic métallique inversé', category: 'Porte / Serrure' },

  // Motion
  { value: 'motion', label: 'Mouvement', description: 'Balayage subtil', category: 'Détection' },

  // Media
  { value: 'media_play', label: 'Play', description: 'Blip enjoué montant', category: 'Média' },
  { value: 'media_pause', label: 'Pause', description: 'Drop doux descendant', category: 'Média' },
  { value: 'media_next', label: 'Piste suivante', description: "Balayage rapide vers l'avant", category: 'Média' },

  // Vacuum
  { value: 'vacuum_start', label: 'Aspirateur départ', description: 'Ronronnement moteur montant', category: 'Aspirateur' },
  { value: 'vacuum_dock', label: 'Aspirateur retour', description: 'Tonalités descendantes apaisantes', category: 'Aspirateur' },

  // Climate
  { value: 'temperature_up', label: 'Température +', description: 'Pip ascendant rapide', category: 'Climat' },
  { value: 'temperature_down', label: 'Température −', description: 'Pip descendant rapide', category: 'Climat' },

  // Light
  { value: 'brightness_up', label: 'Luminosité +', description: 'Glow montant doux', category: 'Lumière' },
  { value: 'brightness_down', label: 'Luminosité −', description: 'Dimming doux', category: 'Lumière' },

  // Environment
  { value: 'water', label: 'Eau', description: 'Goutte bubbly', category: 'Environnement' },
  { value: 'battery_low', label: 'Batterie faible', description: "Pulse d'avertissement lent", category: 'Environnement' },
  { value: 'chime', label: 'Carillon', description: 'Sonnette plaisante', category: 'Environnement' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByCategory(items: SoundInfo[]): Record<string, SoundInfo[]> {
  const groups: Record<string, SoundInfo[]> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }
  return groups;
}

function noteDuration(preset: SoundPreset): number {
  const notes = PRESETS[preset];
  return Math.max(...notes.map(n => n.start + n.duration));
}

// ── Components ────────────────────────────────────────────────────────────────

function SoundButton({ info }: { info: SoundInfo }) {
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    playSound(info.value);
    const dur = noteDuration(info.value);
    setTimeout(() => setPlaying(false), dur * 1000 + 200);
  }

  return (
    <button
      onClick={handlePlay}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all w-full ${
        playing
          ? 'bg-blue-500/20 border border-blue-400/40 scale-[0.98]'
          : 'gc-inner border border-white/10 hover:border-white/25 hover:bg-white/5'
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-colors ${
          playing ? 'bg-blue-500/30 text-blue-300' : 'bg-white/5 text-white/40'
        }`}
      >
        {playing ? <Volume2 size={14} className='animate-pulse' /> : <Play size={12} />}
      </div>
      <div className='min-w-0'>
        <div className='text-white text-sm font-medium truncate'>{info.label}</div>
        <div className='text-white/35 text-xs truncate'>{info.description}</div>
      </div>
      <code className='ml-auto text-[10px] text-white/20 font-mono shrink-0'>{info.value}</code>
    </button>
  );
}

function PlayAllButton({ sounds }: { sounds: SoundInfo[] }) {
  const [playing, setPlaying] = useState(false);

  function handlePlayAll() {
    if (playing) return;
    setPlaying(true);
    let delay = 0;
    for (const s of sounds) {
      setTimeout(() => playSound(s.value), delay);
      delay += noteDuration(s.value) * 1000 + 400;
    }
    setTimeout(() => setPlaying(false), delay);
  }

  return (
    <button
      onClick={handlePlayAll}
      disabled={playing}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
        playing ? 'bg-blue-500/40 text-white/60 cursor-wait' : 'bg-blue-500/80 hover:bg-blue-500 text-white cursor-pointer'
      }`}
    >
      <Volume2 size={14} className={playing ? 'animate-pulse' : ''} />
      {playing ? 'Lecture en cours…' : 'Jouer tous les sons'}
    </button>
  );
}

function SoundLibrary() {
  const groups = groupByCategory(SOUND_CATALOG);
  const totalPresets = Object.keys(PRESETS).length;

  return (
    <div className='flex flex-col gap-6 max-w-2xl'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-white text-lg font-semibold'>Sound Library</h2>
          <p className='text-white/40 text-xs mt-1'>{totalPresets} presets synthétisés — Web Audio API, aucun fichier externe</p>
        </div>
        <PlayAllButton sounds={SOUND_CATALOG} />
      </div>

      {/* Categories */}
      {Object.entries(groups).map(([category, sounds]) => (
        <div key={category}>
          <div className='flex items-center gap-2 mb-3'>
            <h3 className='text-white/60 text-xs font-semibold uppercase tracking-wider'>{category}</h3>
            <span className='text-white/20 text-[10px]'>({sounds.length})</span>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            {sounds.map(info => (
              <SoundButton key={info.value} info={info} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Storybook ─────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Sound Library',
  parameters: {
    backgrounds: { disable: true },
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSounds: Story = {
  name: '🔊 Bibliothèque complète',
  render: () => <SoundLibrary />,
};

// ── Category stories ──────────────────────────────────────────────────────────

function CategoryStory({ category }: { category: string }) {
  const sounds = SOUND_CATALOG.filter(s => s.category === category);
  return (
    <div className='flex flex-col gap-3 max-w-md'>
      <div className='flex items-center justify-between'>
        <h3 className='text-white/60 text-sm font-semibold uppercase tracking-wider'>{category}</h3>
        <PlayAllButton sounds={sounds} />
      </div>
      <div className='flex flex-col gap-2'>
        {sounds.map(info => (
          <SoundButton key={info.value} info={info} />
        ))}
      </div>
    </div>
  );
}

export const UIGenerique: Story = {
  name: 'UI générique',
  render: () => <CategoryStory category='UI générique' />,
};

export const Toggle: Story = {
  name: 'Toggle',
  render: () => <CategoryStory category='Toggle' />,
};

export const Alarme: Story = {
  name: 'Alarme',
  render: () => <CategoryStory category='Alarme' />,
};

export const PorteSerrure: Story = {
  name: 'Porte / Serrure',
  render: () => <CategoryStory category='Porte / Serrure' />,
};

export const Media: Story = {
  name: 'Média',
  render: () => <CategoryStory category='Média' />,
};

export const Aspirateur: Story = {
  name: 'Aspirateur',
  render: () => <CategoryStory category='Aspirateur' />,
};

export const Climat: Story = {
  name: 'Climat',
  render: () => <CategoryStory category='Climat' />,
};

export const Lumiere: Story = {
  name: 'Lumière',
  render: () => <CategoryStory category='Lumière' />,
};

export const Environnement: Story = {
  name: 'Environnement',
  render: () => <CategoryStory category='Environnement' />,
};

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Fan, Flame, Lightbulb, Lock, Package, Snowflake, User, Volume2 } from 'lucide-react';
import { Chip } from './Chip';
import { PagerArrows } from './PagerArrows';
import { Sheet } from './Sheet';
import { PillSlider } from './PillSlider';
import { Dial } from './Dial';
import { DeviceTile } from './DeviceTile';
import { RoomLightTile } from './RoomLightTile';

/** Composants de base de la v2, aux jetons du design system (`src/design/tokens.json`). */
const meta: Meta = {
  title: 'Design system v2',
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj;

export const Tuiles: Story = {
  render: function Render() {
    const [fan, setFan] = useState(false);
    const [lock, setLock] = useState(true);
    return (
      <div className='grid w-[440px] grid-cols-2 gap-3 rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-[22px]'>
        <DeviceTile name='Ventilateur' state={fan ? 'En marche' : 'Arrêté'} icon={Fan} active={fan} onToggle={() => setFan(v => !v)} />
        <DeviceTile
          name="Porte d'entrée"
          state={lock ? 'Verrouillée' : 'Déverrouillée'}
          icon={Lock}
          active={lock}
          onToggle={() => setLock(v => !v)}
          onMore={() => {}}
          moreLabel='Plus de réglages'
        />
      </div>
    );
  },
};

export const TuileDePiece: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    const [brightness, setBrightness] = useState(60);
    return (
      <div className='w-[480px]'>
        <RoomLightTile
          room="Chambre d'amis"
          on={on}
          brightness={brightness}
          onToggle={() => setOn(v => !v)}
          onBrightness={setBrightness}
          labels={{ toggle: 'Allumer ou éteindre', brightness: 'Luminosité', more: 'Options de la pièce' }}
          onMore={() => {}}
        />
      </div>
    );
  },
};

export const Curseurs: Story = {
  render: function Render() {
    const [light, setLight] = useState(70);
    const [volume, setVolume] = useState(45);
    return (
      <div className='flex h-[280px] w-[440px] items-stretch gap-6 rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-2)] p-6'>
        <PillSlider
          orientation='vertical'
          value={light}
          onChange={setLight}
          label='Luminosité chambre'
          valueText={`${light} %`}
          icon={Lightbulb}
          fill='var(--ds-heat)'
          iconColor='#5a2208'
        />
        <div className='flex flex-1 flex-col justify-center'>
          <PillSlider value={volume} onChange={setVolume} label='Volume' valueText={`${volume} %`} icon={Volume2} />
        </div>
      </div>
    );
  },
};

const THERMOSTAT_MODES = [
  { id: 'eco', label: 'Éco' },
  { id: 'heat', label: 'Chauffage' },
  { id: 'cool', label: 'Clim' },
  { id: 'off', label: 'Arrêt' },
] as const;
type ThermostatMode = (typeof THERMOSTAT_MODES)[number]['id'];

export const Thermostat: Story = {
  render: function Render() {
    const [target, setTarget] = useState(21);
    const [hvac, setHvac] = useState<ThermostatMode>('heat');
    return (
      <div className='w-[400px] rounded-[26px] bg-[var(--ds-surface-2)] px-5 pb-3 pt-5 text-[var(--ds-ink)]'>
        <span className='text-xl font-medium'>Thermostat</span>
        <Dial
          value={target}
          min={16}
          max={26}
          onChange={setTarget}
          mode={hvac === 'cool' ? 'cool' : 'heat'}
          display={`${target}°`}
          caption='Actuellement 19°'
          icon={
            hvac === 'cool' ? <Snowflake size={26} aria-hidden='true' /> : <Flame size={26} color='var(--ds-heat-ink)' aria-hidden='true' />
          }
          modes={[...THERMOSTAT_MODES]}
          activeMode={hvac}
          onModeChange={setHvac}
          labels={{ decrease: 'Baisser la consigne', increase: 'Monter la consigne', modes: 'Mode' }}
        />
      </div>
    );
  },
};

export const Pastilles: Story = {
  render: () => (
    <div className='flex gap-3'>
      <Chip icon={User} label='12' />
      <Chip icon={Package} label='0' />
      <Chip label='Aujourd’hui' active onClick={() => {}} />
    </div>
  ),
};

export const FlechesSurPhoto: Story = {
  render: () => (
    <div className='rounded-[var(--ds-radius-lg)] bg-[#8fb6c8] p-8'>
      <PagerArrows
        onPrev={() => {}}
        onNext={() => {}}
        onMore={() => {}}
        labels={{ prev: 'Photo précédente', next: 'Photo suivante', more: "Plus d'options" }}
      />
    </div>
  ),
};

export const Feuille: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [brightness, setBrightness] = useState(35);
    return (
      <>
        <button onClick={() => setOpen(true)} className='rounded-full bg-[var(--ds-accent)] px-5 py-3 text-white'>
          Ouvrir la feuille
        </button>
        <Sheet open={open} onClose={() => setOpen(false)} title='Lumières chambre' subtitle='2 allumées' closeLabel='Fermer'>
          <div className='rounded-[26px] bg-[var(--ds-surface-2)] p-6'>
            <PillSlider value={brightness} onChange={setBrightness} label='Luminosité' valueText={`${brightness} %`} icon={Lightbulb} />
          </div>
        </Sheet>
      </>
    );
  },
};

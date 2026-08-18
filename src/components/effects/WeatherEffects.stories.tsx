import type { Meta, StoryObj } from '@storybook/react';
import WeatherEffects, { getEffectType, hasLightning } from './WeatherEffects';

/**
 * Les états météo de Home Assistant, dans l'ordre de sa documentation.
 * `sunny` et `exceptional` sont là pour vérifier qu'ils ne déclenchent rien.
 */
const CONDITIONS = [
  'sunny',
  'clear-night',
  'partlycloudy',
  'cloudy',
  'fog',
  'windy',
  'windy-variant',
  'rainy',
  'pouring',
  'lightning',
  'lightning-rainy',
  'snowy',
  'snowy-rainy',
  'hail',
  'exceptional',
];

/** Ce qu'on attend à l'œil, pour comparer sans relire le code. */
function describe(condition: string): string {
  const effect = getEffectType(condition);
  if (!effect) return hasLightning(condition) ? 'éclairs seuls' : 'aucun effet';
  return hasLightning(condition) ? `${effect} + éclairs` : effect;
}

/** Card sombre au format d'un widget, avec l'effet posé dedans. */
function EffectCard({ condition, height = 220 }: { condition: string; height?: number }) {
  return (
    <div className='gc rounded-3xl relative overflow-hidden flex flex-col justify-end p-3.5' style={{ height }}>
      <WeatherEffects condition={condition} />
      <div className='relative'>
        <div className='text-white/85 text-sm font-medium'>{condition}</div>
        <div className='text-white/35 text-[11px]'>{describe(condition)}</div>
      </div>
    </div>
  );
}

/**
 * Bac à sable des animations météo.
 *
 * Rien ne s'anime si le système est réglé sur « animations réduites » ni si
 * l'onglet est en arrière-plan : c'est `useLowPowerMotion`, et c'est voulu —
 * ces cards tournent en continu sur une tablette murale.
 */
const meta: Meta<typeof WeatherEffects> = {
  title: 'Effects/WeatherEffects',
  component: WeatherEffects,
  argTypes: {
    condition: {
      control: 'select',
      options: CONDITIONS,
      description: 'État de l’entité `weather` de Home Assistant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof WeatherEffects>;

/** Une card, un sélecteur : choisir la condition dans les contrôles. */
export const Selecteur: Story = {
  args: { condition: 'rainy' },
  render: args => <EffectCard condition={args.condition ?? ''} height={260} />,
};

/** Toutes les conditions côte à côte — la vue de comparaison. */
export const Toutes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className='grid grid-cols-2 gap-3'>
      {CONDITIONS.map(condition => (
        <EffectCard key={condition} condition={condition} height={140} />
      ))}
    </div>
  ),
};

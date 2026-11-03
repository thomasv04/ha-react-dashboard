import type { Meta, StoryObj } from '@storybook/react';
import { WeatherCard } from './WeatherCard';

const meta: Meta<typeof WeatherCard> = {
  title: 'Cards/WeatherCard',
  component: WeatherCard,
  // Une tuile de la grille : la card s'adapte à sa case, elle n'a pas de taille propre.
  decorators: [
    Story => (
      <div style={{ width: 320, height: 272 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WeatherCard>;

/** Carte météo avec température, vent et prévisions sur 4 jours. */
export const Default: Story = {};

/** Tuile étroite (≈ 154 px) : température et icône réduites, prévisions repliées. */
export const Narrow: Story = {
  decorators: [
    Story => (
      <div style={{ width: 154, height: 272 }}>
        <Story />
      </div>
    ),
  ],
};

/** Deux rangées : icône et température à gauche, condition et extrêmes du jour à droite. */
export const TwoRows: Story = {
  decorators: [
    Story => (
      <div style={{ width: 320, height: 176 }}>
        <Story />
      </div>
    ),
  ],
};

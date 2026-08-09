import type { Meta, StoryObj } from '@storybook/react';
import { AlarmCard } from './AlarmCard';

const meta: Meta<typeof AlarmCard> = {
  title: 'Cards/AlarmCard',
  component: AlarmCard,
  // La card adapte sa disposition à sa hauteur mesurée. Sans hauteur définie,
  // le conteneur suit le contenu : la disposition change la hauteur, qui change
  // la disposition, et la boucle ne converge jamais. Dans le dashboard la
  // cellule de grille impose toujours une hauteur — on la reproduit ici.
  decorators: [
    Story => (
      <div style={{ width: 280, height: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AlarmCard>;

/** État par défaut : alarme désarmée (mock HA). */
export const Default: Story = {};

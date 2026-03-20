import type { Meta, StoryObj } from '@storybook/react';
import { RoomsGrid } from './RoomsGrid';

const meta: Meta<typeof RoomsGrid> = {
  title: 'Cards/RoomsGrid',
  component: RoomsGrid,
};

export default meta;
type Story = StoryObj<typeof RoomsGrid>;

/** Liste des pièces avec température et humidité pour les capteurs disponibles. */
export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react';
import { EnergyCard } from './EnergyCard';

const meta: Meta<typeof EnergyCard> = {
  title: 'Cards/EnergyCard',
  component: EnergyCard,
};

export default meta;
type Story = StoryObj<typeof EnergyCard>;

/** Batterie en charge avec production solaire active. */
export const Default: Story = {};

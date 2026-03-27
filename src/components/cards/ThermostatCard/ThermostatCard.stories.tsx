import type { Meta, StoryObj } from '@storybook/react';
import { ThermostatCard } from './ThermostatCard';

const meta: Meta<typeof ThermostatCard> = {
  title: 'Cards/ThermostatCard',
  component: ThermostatCard,
};

export default meta;
type Story = StoryObj<typeof ThermostatCard>;

/** Jauge circulaire du thermostat avec préréglages de mode. */
export const Default: Story = {};

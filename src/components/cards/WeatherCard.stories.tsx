import type { Meta, StoryObj } from '@storybook/react';
import { WeatherCard } from './WeatherCard';

const meta: Meta<typeof WeatherCard> = {
  title: 'Cards/WeatherCard',
  component: WeatherCard,
};

export default meta;
type Story = StoryObj<typeof WeatherCard>;

/** Carte météo avec température, vent et prévisions sur 4 jours. */
export const Default: Story = {};

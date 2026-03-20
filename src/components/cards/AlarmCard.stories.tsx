import type { Meta, StoryObj } from '@storybook/react';
import { AlarmCard } from './AlarmCard';

const meta: Meta<typeof AlarmCard> = {
  title: 'Cards/AlarmCard',
  component: AlarmCard,
};

export default meta;
type Story = StoryObj<typeof AlarmCard>;

/** État par défaut : alarme désarmée (mock HA). */
export const Default: Story = {};

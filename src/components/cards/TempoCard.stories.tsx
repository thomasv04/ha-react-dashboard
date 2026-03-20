import type { Meta, StoryObj } from '@storybook/react';
import { TempoCard } from './TempoCard';

const meta: Meta<typeof TempoCard> = {
  title: 'Cards/TempoCard',
  component: TempoCard,
};

export default meta;
type Story = StoryObj<typeof TempoCard>;

/** Tarification Tempo EDF — couleur du jour, lendemain et jours restants. */
export const Default: Story = {};

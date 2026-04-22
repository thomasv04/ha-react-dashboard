import type { Meta, StoryObj } from '@storybook/react';
import { PelletCard } from './PelletCard';

const meta: Meta<typeof PelletCard> = {
  title: 'Cards/PelletCard',
  component: PelletCard,
};

export default meta;
type Story = StoryObj<typeof PelletCard>;

/** Poêle à pellet allumé — contrôles +/− et bouton ON/OFF disponibles. */
export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react';
import { ShuttersPanel } from './ShuttersPanel';

const meta: Meta<typeof ShuttersPanel> = {
  title: 'Panels/ShuttersPanel',
  component: ShuttersPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ShuttersPanel>;

/** Contrôle individuel de chaque volet — ouvrir, stopper, fermer. */
export const Default: Story = {};

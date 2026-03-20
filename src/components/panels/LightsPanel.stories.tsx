import type { Meta, StoryObj } from '@storybook/react';
import { LightsPanel } from './LightsPanel';

const meta: Meta<typeof LightsPanel> = {
  title: 'Panels/LightsPanel',
  component: LightsPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof LightsPanel>;

/** Panneau de contrôle des lumières avec toggle et réglage de luminosité. */
export const Default: Story = {};

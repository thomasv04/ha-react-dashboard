import type { Meta, StoryObj } from '@storybook/react';
import { SecurityPanel } from './SecurityPanel';

const meta: Meta<typeof SecurityPanel> = {
  title: 'Panels/SecurityPanel',
  component: SecurityPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SecurityPanel>;

/** Panneau sécurité — contrôle alarme + flux caméras. */
export const Default: Story = {};

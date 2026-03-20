import type { Meta, StoryObj } from '@storybook/react';
import { NotificationsPanel } from './NotificationsPanel';

const meta: Meta<typeof NotificationsPanel> = {
  title: 'Panels/NotificationsPanel',
  component: NotificationsPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof NotificationsPanel>;

/** Panneau notifications — rappels actifs avec action de dismiss. */
export const Default: Story = {};

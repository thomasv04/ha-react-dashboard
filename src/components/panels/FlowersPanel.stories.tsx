import type { Meta, StoryObj } from '@storybook/react';
import { FlowersPanel } from './FlowersPanel';

const meta: Meta<typeof FlowersPanel> = {
  title: 'Panels/FlowersPanel',
  component: FlowersPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof FlowersPanel>;

/** Panneau plantes — humidité, température, luminosité et humidité de l&apos;air. */
export const Default: Story = {};

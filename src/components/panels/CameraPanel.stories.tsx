import type { Meta, StoryObj } from '@storybook/react';
import { CameraPanel } from './CameraPanel';

const meta: Meta<typeof CameraPanel> = {
  title: 'Panels/CameraPanel',
  component: CameraPanel,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div style={{ maxWidth: '700px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CameraPanel>;

/** Panneau caméras — liste complète des flux avec sélecteur de caméra. */
export const Default: Story = {};

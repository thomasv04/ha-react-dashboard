import type { Meta, StoryObj } from '@storybook/react';
import { CameraCard } from './CameraCard';

const meta: Meta<typeof CameraCard> = {
  title: 'Cards/CameraCard',
  component: CameraCard,
  parameters: {
    // CameraCard embeds iframes — give it more width
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CameraCard>;

export const Default: Story = {};

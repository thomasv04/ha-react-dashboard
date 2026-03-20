import type { Meta, StoryObj } from '@storybook/react';
import { BottomNav } from './BottomNav';

const meta: Meta<typeof BottomNav> = {
  title: 'Layout/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className='relative h-[200px] overflow-hidden'>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

/**
 * Barre de navigation fixée en bas — chips de statut à gauche,
 * icônes de navigation à droite.
 */
export const Default: Story = {};

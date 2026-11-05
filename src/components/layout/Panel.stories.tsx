import type { Meta, StoryObj } from '@storybook/react';
import { Panel } from './Panel';

const meta: Meta<typeof Panel> = {
  title: 'Layout/Panel',
  component: Panel,
  argTypes: {
    title: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    title: 'Lumières',
    children: (
      <div className='space-y-2'>
        <p className='text-white/50 text-sm'>Contenu de la modale ici.</p>
        <p className='text-white/50 text-sm'>Ligne 2</p>
        <p className='text-white/50 text-sm'>Ligne 3</p>
      </div>
    ),
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { Panel } from './Panel';
import { Lightbulb } from 'lucide-react';

const meta: Meta<typeof Panel> = {
  title: 'Layout/Panel',
  component: Panel,
  argTypes: {
    title: { control: 'text' },
    wide: { control: 'boolean' },
  },
  decorators: [
    Story => (
      <div className='relative w-full min-h-[400px] flex items-center justify-center p-4'>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    title: 'Lumières',
    icon: <Lightbulb size={20} />,
    children: (
      <div className='space-y-2'>
        <p className='text-white/50 text-sm'>Contenu du panneau ici.</p>
        <p className='text-white/50 text-sm'>Ligne 2</p>
        <p className='text-white/50 text-sm'>Ligne 3</p>
      </div>
    ),
  },
};

export const Wide: Story = {
  args: {
    title: 'Vue large',
    wide: true,
    children: <p className='text-white/50 text-sm'>Panneau en mode large.</p>,
  },
};

export const NoIcon: Story = {
  args: {
    title: 'Sans icône',
    children: <p className='text-white/50 text-sm'>Panneau sans icône dans l&apos;en-tête.</p>,
  },
};

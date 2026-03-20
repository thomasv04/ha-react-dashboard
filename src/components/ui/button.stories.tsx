import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Search, Mail, Plus, Trash2 } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Button', variant: 'default', size: 'default' },
};

export const Outline: Story = {
  args: { children: 'Button', variant: 'outline' },
};

export const Secondary: Story = {
  args: { children: 'Button', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Button', variant: 'ghost' },
};

export const Destructive: Story = {
  args: { children: 'Supprimer', variant: 'destructive' },
};

export const Link: Story = {
  args: { children: 'En savoir plus', variant: 'link' },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail size={16} /> Envoyer
      </>
    ) as unknown as string,
    variant: 'default',
  },
};

export const IconOnly: Story = {
  args: { children: <Search />, size: 'icon', variant: 'outline', 'aria-label': 'Rechercher' },
};

export const Small: Story = {
  args: { children: 'Small', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Large', size: 'lg' },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-2'>
      <Button variant='default'>Default</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className='flex items-center flex-wrap gap-2'>
      <Button size='xs'>xs</Button>
      <Button size='sm'>sm</Button>
      <Button size='default'>default</Button>
      <Button size='lg'>lg</Button>
      <Button size='icon'>
        <Plus />
      </Button>
      <Button size='icon-sm'>
        <Trash2 />
      </Button>
    </div>
  ),
};

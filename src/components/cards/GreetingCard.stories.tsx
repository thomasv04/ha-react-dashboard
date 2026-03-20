import type { Meta, StoryObj } from '@storybook/react';
import { GreetingCard, ClockWidget } from './GreetingCard';

const meta: Meta<typeof GreetingCard> = {
  title: 'Cards/GreetingCard',
  component: GreetingCard,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof GreetingCard>;

export const Default: Story = {};

export const Clock: StoryObj<typeof ClockWidget> = {
  name: 'ClockWidget',
  render: () => <ClockWidget />,
};

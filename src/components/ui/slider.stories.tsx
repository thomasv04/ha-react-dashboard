import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';
import { useState } from 'react';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  argTypes: {
    min: { control: { type: 'number' } },
    max: { control: { type: 'number' } },
    step: { control: { type: 'number' } },
    disabled: { control: 'boolean' },
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: { defaultValue: [40], min: 0, max: 100 },
};

export const Range: Story = {
  args: { defaultValue: [20, 80], min: 0, max: 100 },
};

export const Disabled: Story = {
  args: { defaultValue: [60], disabled: true },
};

export const WithSteps: Story = {
  args: { defaultValue: [50], min: 0, max: 100, step: 10 },
};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState([50]);
    return (
      <div className='space-y-4 w-full'>
        <Slider value={value} onValueChange={setValue} min={0} max={100} />
        <p className='text-sm text-muted-foreground text-center'>Valeur : {value[0]}%</p>
      </div>
    );
  },
};

export const Brightness: Story = {
  name: 'Luminosité (0–255)',
  render: () => {
    const [value, setValue] = useState([180]);
    const pct = Math.round((value[0] / 255) * 100);
    return (
      <div className='space-y-4 w-full'>
        <Slider value={value} onValueChange={setValue} min={0} max={255} step={1} />
        <p className='text-sm text-muted-foreground text-center'>Luminosité : {pct}%</p>
      </div>
    );
  },
};

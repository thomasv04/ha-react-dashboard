import type { Meta, StoryObj } from '@storybook/react';
import { PageProvider } from '@/context/PageContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { ThermostatCard } from './ThermostatCard';

const meta: Meta<typeof ThermostatCard> = {
  title: 'Cards/ThermostatCard',
  component: ThermostatCard,
  decorators: [
    Story => (
      <PageProvider>
        <WidgetConfigProvider>
          <Story />
        </WidgetConfigProvider>
      </PageProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThermostatCard>;

/** Jauge circulaire du thermostat avec préréglages de mode. */
export const Default: Story = {};

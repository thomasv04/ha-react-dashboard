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
          {/* Une tuile de la grille : la card s'adapte à sa case, elle n'a pas de taille propre. */}
          <div style={{ width: 320, height: 272 }}>
            <Story />
          </div>
        </WidgetConfigProvider>
      </PageProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThermostatCard>;

/** Jauge circulaire du thermostat avec préréglages de mode. */
export const Default: Story = {};



import type { Meta, StoryObj } from '@storybook/react';
import { useState, createContext, useContext } from 'react';
import { ThermostatCard } from './ThermostatCard';
import * as hakitCore from '../../../.storybook/mocks/hakit-core';

const meta: Meta<typeof ThermostatCard> = {
  title: 'Cards/ThermostatCard',
  component: ThermostatCard,
};

export default meta;
type Story = StoryObj<typeof ThermostatCard>;


/** Jauge circulaire du thermostat avec préréglages de mode, drag interactif Storybook. */

// Context pour surcharger useHass localement
const LocalHassContext = createContext<any>(null);

// Faux hook qui priorise le contexte local si présent
function useLocalHass() {
  const ctx = useContext(LocalHassContext);
  return ctx || hakitCore.useHass();
}

// Patch temporaire : on remplace useHass dans ThermostatCard par useLocalHass
// @ts-ignore
ThermostatCard.__Rewire_useHass = useLocalHass;

export const Default: Story = {
  render: () => {
    const [temp, setTemp] = useState(21);
    const basePellet = hakitCore.ENTITIES && hakitCore.ENTITIES['climate.pellet']
      ? hakitCore.ENTITIES['climate.pellet']
      : { entity_id: 'climate.pellet', state: 'heat', attributes: { temperature: temp, current_temperature: 19.5, hvac_action: 'heating', preset_mode: 'comfort', hvac_modes: ['off', 'heat'] } };
    const localHass = {
      entities: {
        ...hakitCore.ENTITIES,
        'climate.pellet': {
          ...basePellet,
          attributes: {
            ...basePellet.attributes,
            temperature: temp,
          },
        },
      },
      helpers: {
        ...hakitCore.mockHelpers,
        callService: (args: any) => {
          if (args.domain === 'climate' && args.service === 'set_temperature') {
            setTemp(args.serviceData.temperature);
          }
        },
      },
    };
    return (
      <LocalHassContext.Provider value={localHass}>
        <ThermostatCard />
      </LocalHassContext.Provider>
    );
  },
};

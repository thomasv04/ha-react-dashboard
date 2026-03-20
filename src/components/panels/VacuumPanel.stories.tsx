import type { Meta, StoryObj } from '@storybook/react';
import { VacuumPanel } from './VacuumPanel';

const meta: Meta<typeof VacuumPanel> = {
  title: 'Panels/VacuumPanel',
  component: VacuumPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof VacuumPanel>;

/** Panneau aspirateur : sélection des pièces et contrôles de nettoyage. */
export const Default: Story = {};

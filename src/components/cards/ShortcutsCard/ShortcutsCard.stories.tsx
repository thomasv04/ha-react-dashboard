import type { Meta, StoryObj } from '@storybook/react';
import { ShortcutsCard } from './ShortcutsCard';

const meta: Meta<typeof ShortcutsCard> = {
  title: 'Cards/ShortcutsCard',
  component: ShortcutsCard,
};

export default meta;
type Story = StoryObj<typeof ShortcutsCard>;

/**
 * Grille de raccourcis vers les différents panneaux.
 * Cliquer ouvre le panneau correspondant (géré par PanelContext).
 */
export const Default: Story = {};

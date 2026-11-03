import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PageProvider } from '@/context/PageContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import type { LockCardConfig } from '@/types/widget-configs';
import { LockCard } from './LockCard';

/** Une serrure du mock, dans une tuile `width` × `height` : la card n'a pas de taille propre. */
const inTile = (entityId: string, width: number, height: number) => (Story: () => ReactNode) => {
  const config: LockCardConfig = { type: 'lock', entityId, confirmUnlock: false };
  return (
    <PageProvider>
      <WidgetConfigProvider initialAllWidgetConfigs={{ home: { lock: config } }}>
        <div style={{ width, height }}>
          <Story />
        </div>
      </WidgetConfigProvider>
    </PageProvider>
  );
};

const meta: Meta<typeof LockCard> = {
  title: 'Cards/LockCard',
  component: LockCard,
};

export default meta;
type Story = StoryObj<typeof LockCard>;

/** Verrouillée, quatre rangées : tuile bleue, grand bouton rond au centre. */
export const Locked: Story = { decorators: [inTile('lock.front_door', 320, 352)] };

/** Déverrouillée : le bouton passe en orange, la porte est ouverte. */
export const Unlocked: Story = { decorators: [inTile('lock.garage', 320, 352)] };

/** Trois rangées : bouton un peu plus petit. */
export const ThreeRows: Story = { decorators: [inTile('lock.front_door', 320, 272)] };

/** Deux rangées : la tuile compacte, une icône en bas à gauche. */
export const Compact: Story = { decorators: [inTile('lock.front_door', 320, 176)] };

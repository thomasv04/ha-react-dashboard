import type { Meta, StoryObj } from '@storybook/react';
import { PageProvider } from '@/context/PageContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { MediaPlayerCard } from './MediaPlayerCard';
import MediaPlayerMoreInfo from '@/components/modals/MediaPlayerMoreInfo';

const meta: Meta<typeof MediaPlayerCard> = {
  title: 'Cards/MediaPlayerCard',
  component: MediaPlayerCard,
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
type Story = StoryObj<typeof MediaPlayerCard>;

/** Pochette, titre, progression, contrôles et volume dans une tuile. */
export const Default: Story = {};

/** La fiche « plus d'infos » : pochette floutée en fond, contrôles, volume, sortie. */
export const MoreInfo: Story = {
  decorators: [
    () => (
      <div
        style={{
          width: 560,
          height: 760,
          overflow: 'auto',
          background: 'var(--ds-sheet)',
          color: 'var(--ds-ink)',
          borderRadius: 'var(--ds-radius-2xl)',
        }}
      >
        <MediaPlayerMoreInfo entityId='media_player.salon' widgetId='media_player' />
      </div>
    ),
  ],
};

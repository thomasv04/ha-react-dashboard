import type { Meta, StoryObj } from '@storybook/react';
import { ScreensaverClock } from './ScreensaverClock';
import { ScreensaverNowPlaying } from './ScreensaverNowPlaying';

const meta: Meta<typeof ScreensaverNowPlaying> = {
  title: 'Wallpanel/ScreensaverNowPlaying',
  component: ScreensaverNowPlaying,
  args: { onOpen: () => {} },
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      // L'écran de veille d'une tablette 1280 × 800 : une photo (ici un dégradé), l'heure, et ce qui joue.
      <div
        style={{
          position: 'relative',
          width: 1280,
          height: 800,
          overflow: 'hidden',
          background: 'radial-gradient(at 70% 25%, #c9a27a 0%, #7a5a48 35%, #2c2a33 75%), linear-gradient(160deg, #3b4a5e, #1b1f27)',
        }}
      >
        <ScreensaverClock layout='clock' />
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ScreensaverNowPlaying>;

/** La musique du salon, en bas à droite de la veille. */
export const Default: Story = {};

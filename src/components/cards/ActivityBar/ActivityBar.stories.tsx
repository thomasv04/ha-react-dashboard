import type { Meta, StoryObj } from '@storybook/react';
import { ActivityBar } from './ActivityBar';

const meta: Meta<typeof ActivityBar> = {
  title: 'Cards/ActivityBar',
  component: ActivityBar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4'>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityBar>;

/**
 * ActivityBar avec tous les éléments: pills d'état + avatars
 * Sur desktop: affiche tous les pills + avatars
 * Sur mobile: cache les pills avec hideOnMobile + cache les avatars
 */
export const Default: Story = {
  parameters: {
    viewport: {
      viewport: 'desktop',
      width: 1440,
      height: 900,
    },
  },
  render: () => (
    <div className='w-full'>
      <h3 className='text-white/70 text-sm mb-4'>Desktop View (1440px)</h3>
      <div className='bg-white/5 rounded-lg p-4 backdrop-blur'>
        <ActivityBar />
      </div>
    </div>
  ),
};

/**
 * ActivityBar sur mobile: cache les pills volumineuses et les avatars
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      viewport: 'mobile1',
      width: 375,
      height: 667,
    },
  },
  render: () => (
    <div className='w-full'>
      <h3 className='text-white/70 text-sm mb-4'>Mobile View (375px)</h3>
      <div className='bg-white/5 rounded-lg p-4 backdrop-blur' style={{ width: '375px' }}>
        <ActivityBar />
      </div>
    </div>
  ),
};

/**
 * ActivityBar sur tablette (768px): affiche certains pills
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      viewport: 'tablet',
      width: 800,
      height: 600,
    },
  },
  render: () => (
    <div className='w-full'>
      <h3 className='text-white/70 text-sm mb-4'>Tablet View (800px)</h3>
      <div className='bg-white/5 rounded-lg p-4 backdrop-blur' style={{ width: '800px' }}>
        <ActivityBar />
      </div>
    </div>
  ),
};

/**
 * Responsive: redimensionnez la fenêtre pour voir les changements
 */
export const Responsive: Story = {
  render: () => (
    <div className='w-full'>
      <h3 className='text-white/70 text-sm mb-4'>Responsive - Redimensionnez votre fenêtre</h3>
      <div className='bg-white/5 rounded-lg p-4 backdrop-blur w-full'>
        <ActivityBar />
      </div>
      <div className='text-white/50 text-xs mt-4 space-y-1'>
        <p>• Desktop (≥1200px): affiche tous les pills + avatars</p>
        <p>• Tablet (768-1200px): affiche certains pills (hideOnMobile=false) + avatars</p>
        <p>• Mobile (&lt;768px): affiche seulement pills critical (hideOnMobile=false) + pas d'avatars</p>
      </div>
    </div>
  ),
};

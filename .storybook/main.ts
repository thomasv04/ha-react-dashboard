import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mergeConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          '@hakit/core': path.resolve(__dirname, './mocks/hakit-core.tsx'),
          '@hakit/components': path.resolve(__dirname, './mocks/hakit-components.tsx'),
        },
      },
      // Prevent the project's vite.config.ts env var check from running
      define: {
        'import.meta.env.VITE_HA_URL': JSON.stringify('http://homeassistant.local:8123'),
        'import.meta.env.VITE_FOLDER_NAME': JSON.stringify('ha-dashboard'),
      },
    });
  },
};

export default config;

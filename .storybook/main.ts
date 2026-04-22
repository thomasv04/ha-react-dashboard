import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mergeConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)', '../src/**/*.mdx'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  addons: ['@storybook/addon-docs'],
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        tailwindcss(),
        {
          name: 'storybook-mock-api',
          configureServer(server: {
            middlewares: {
              use(
                path: string,
                handler: (req: unknown, res: { setHeader(k: string, v: string): void; end(body: string): void }) => void
              ): void;
            };
          }) {
            server.middlewares.use(
              '/api/translations/overrides',
              (_req: unknown, res: { setHeader(k: string, v: string): void; end(body: string): void }) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ overrides: {} }));
              }
            );
          },
        },
      ],
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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

// For HACS frontend, use relative paths (compatible with any URL)
// For Add-on, use absolute paths (served from /local/ha-dashboard/)
const useRelativePaths = process.env.VITE_HACS === 'true';
const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME || 'community/ha-react-dashboard';
const basePath = useRelativePaths ? './' : `/local/${VITE_FOLDER_NAME}/`;

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

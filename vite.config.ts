import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

// Default to HACS path (community/ha-react-dashboard)
// For Add-on, override with VITE_FOLDER_NAME=ha-dashboard during build
const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME || 'community/ha-react-dashboard';

// https://vite.dev/config/
export default defineConfig({
  base: `/local/${VITE_FOLDER_NAME}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

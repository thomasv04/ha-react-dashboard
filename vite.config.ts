import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

// Use env var or default value (important for CI/Docker where .env doesn't exist)
const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME || 'ha-dashboard';

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

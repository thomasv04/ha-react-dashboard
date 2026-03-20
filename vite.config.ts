import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME;

// Check if the environment variable is set
if (typeof VITE_FOLDER_NAME === 'undefined' || VITE_FOLDER_NAME === '') {
  console.error(
    'VITE_FOLDER_NAME environment variable is not set, update your .env file with a value naming your dashboard, eg "VITE_FOLDER_NAME=ha-dashboard"'
  );
  process.exit(1);
}

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

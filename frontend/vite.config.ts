import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // ルートディレクトリの .env を参照する
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 3000,
  },
});

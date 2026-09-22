import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import fs from 'node:fs';
import path from 'node:path';

function copyPreloadPlugin() {
  const copy = () => {
    fs.mkdirSync('dist-electron', { recursive: true });
    fs.copyFileSync('electron/preload.cjs', 'dist-electron/preload.cjs');
  };
  return {
    name: 'copy-preload',
    buildStart() {
      copy();
    },
    configureServer(server: any) {
      copy();
      server.watcher.add('electron/preload.cjs');
      server.watcher.on('change', (file: string) => {
        if (file.endsWith('preload.cjs')) {
          copy();
          server.hot.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON === 'true' || mode === 'electron';
  return {
    plugins: [
      react(),
      copyPreloadPlugin(),
      ...(isElectron
        ? [
            electron([
              {
                entry: 'electron/main.ts',
              },
            ]),
            renderer(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
    },
  };
});

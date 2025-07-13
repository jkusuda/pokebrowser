import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

// Plugin to copy styles folder to dist
const copyAssetsPlugin = () => {
  return {
    name: 'copy-assets',
    writeBundle() {
      try {
        // Only copy styles folder now - everything else is built by Vite
        mkdirSync('dist/styles', { recursive: true });
        copyFileSync('styles/contentStyle.css', 'dist/styles/contentStyle.css');
        copyFileSync('styles/authStyle.css', 'dist/styles/authStyle.css');
        copyFileSync('styles/pokedetailStyle.css', 'dist/styles/pokedetailStyle.css');
        copyFileSync('styles/pokedexStyle.css', 'dist/styles/pokedexStyle.css');
        copyFileSync('styles/popupStyle.css', 'dist/styles/popupStyle.css');
        console.log('✅ Copied styles folder to dist/');
      } catch (error) {
        console.warn('Failed to copy styles:', error.message);
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), copyAssetsPlugin()],
  base: './', // This makes all paths relative
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // React apps
        popup: resolve(__dirname, 'src/popup/index.html'),
        pokedex: resolve(__dirname, 'src/pokedex/index.html'),
        'pokemon-entry': resolve(__dirname, 'src/pokemon-entry/index.html'),
        'pokemon-detail': resolve(__dirname, 'src/pokemon-detail/index.html'),
        auth: resolve(__dirname, 'src/auth/index.html'),
        // Extension scripts
        background: resolve(__dirname, 'src/background/background.js'),
        content: resolve(__dirname, 'src/content/content.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Put extension scripts in root of dist
          if (['background', 'content'].includes(chunkInfo.name)) {
            return '[name].js';
          }
          // Put React apps in their folders
          return 'src/[name]/[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    minify: false, // Keep readable for debugging
    sourcemap: true
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});

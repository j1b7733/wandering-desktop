import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',  // Required for Electron: makes asset paths relative to index.html
  build: {
    outDir: 'dist/renderer'  // Separate from electron-builder's dist/win-unpacked output
  }
})

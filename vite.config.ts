import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const backendTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    // Use PostCSS instead of Lightning CSS to avoid native binary issues
    transformer: 'postcss',
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.devtunnels.ms'],
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

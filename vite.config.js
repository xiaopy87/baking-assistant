import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/baking-assistant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '烘焙助手',
        short_name: '烘焙助手',
        description: '烘焙食谱与计时助手',
        theme_color: '#5C3D2E',
        background_color: '#FFF8F0',
        display: 'standalone',
        start_url: '/baking-assistant/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})

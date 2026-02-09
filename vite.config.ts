import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { socketDevPlugin } from './src/server-only/dev-socket-server'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    tailwindcss(),
    react(),
    socketDevPlugin(),
  ],
})

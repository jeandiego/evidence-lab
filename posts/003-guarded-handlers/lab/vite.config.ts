import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/demos/003-guarded-handlers/',
  plugins: [react()],
})

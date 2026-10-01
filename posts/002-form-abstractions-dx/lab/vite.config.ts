import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

// fs.allow: reel.html importa ../evidence/*.json (números do vídeo vêm só de lá)
export default defineConfig({ plugins: [react(), vue()], server: { fs: { allow: ['..'] } } })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

// fs.allow: permite importar ../evidence/*.json
export default defineConfig({ plugins: [react(), vue()], server: { fs: { allow: ['..'] } } })

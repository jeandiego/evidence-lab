import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Biblioteca ES carregada pelo single-spa. O modo "bundled" (só cart) empacota uma cópia própria do
// auth-fetch, para o cenário S8; no modo normal ele é externo e vem do import map.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "../../packages/ui/src") } },
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist",
    emptyOutDir: mode !== "bundled",
    lib: { entry: "src/main.tsx", formats: ["es"], fileName: () => (mode === "bundled" ? "catalog.bundled.js" : "catalog.js") },
    rollupOptions: { external: mode === "bundled" ? [] : ["@shop-lab/auth-fetch"] },
  },
}));

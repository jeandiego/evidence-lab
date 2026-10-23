import { defineConfig } from "vite";

// Utility module servido pelo import map: um único arquivo ES, sem dependências.
export default defineConfig({
  build: { outDir: "dist", lib: { entry: "src/index.ts", formats: ["es"], fileName: () => "index.js" } },
});

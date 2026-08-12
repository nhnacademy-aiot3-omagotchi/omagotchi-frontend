import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "src/main/resources/static/js/home-react",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/main/frontend/home-react/main.jsx",
      output: {
        entryFileNames: "home-app.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});

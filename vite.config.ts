import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".jsx", ".json"]
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022"
    }
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'maplibre': ['maplibre-gl'],
          'idb': ['idb'],
          'capacitor': ['@capacitor/core', '@capacitor/app', '@capacitor/preferences']
        }
      }
    }
  },
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"]
  }
});

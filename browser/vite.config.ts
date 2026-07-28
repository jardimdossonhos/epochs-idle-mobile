import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@react-native-google-signin/google-signin": path.resolve(process.cwd(), "./tests/mocks/google-signin-mock.ts"),
      "@react-native-async-storage/async-storage": path.resolve(process.cwd(), "./tests/mocks/async-storage-mock.ts"),
      "react": path.resolve(process.cwd(), "./mobile/node_modules/react")
    },
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

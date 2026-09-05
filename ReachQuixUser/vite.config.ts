import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    // Split large vendor libraries into separate cached chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached forever, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI component library
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
          ],
          // Charting (huge) — only loaded when Analytics page opens
          "vendor-recharts": ["recharts"],
          // Spreadsheet parser — only needed for CSV import
          "vendor-xlsx": ["xlsx"],
          // Data fetching layer
          "vendor-query": ["@tanstack/react-query"],
          // Firebase Auth
          "vendor-firebase": ["firebase/app", "firebase/auth"],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
});

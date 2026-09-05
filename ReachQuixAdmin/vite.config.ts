import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-firebase": ["firebase/app", "firebase/auth"],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
})

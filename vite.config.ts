import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    fs: {
      // Prevent .env files, certs, and sensitive config from being served
      deny: ['.env', '.env.*', '*.{crt,pem,key}', 'firebase.json', '.firebaserc'],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('/react') || id.includes('react/')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});

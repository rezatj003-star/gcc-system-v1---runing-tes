import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // agar bisa diakses dari HP
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  preview: {
    host: true,
    port: 5173
  }
});
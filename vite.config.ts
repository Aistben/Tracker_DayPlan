import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // превью-хост песочницы + tauri dev
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
  build: { outDir: "dist" },
});

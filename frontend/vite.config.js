import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.mp4"], // ← allow importing .mp4 files
  server: {
    port: 3000,
    host: true, // 👈 allows access from external IPs
    strictPort: true,
    allowedHosts: [
      'localhost',
      '.ngrok-free.app' // 👈 allow all ngrok tunnels (subdomains)
    ],
  },
});

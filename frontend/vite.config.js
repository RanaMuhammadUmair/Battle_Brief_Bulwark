import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // API_URL permite apuntar a otra API si el puerto 3000 está ocupado
    proxy: { "/api": process.env.API_URL ?? "http://localhost:3000" },
  },
});

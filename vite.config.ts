import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? "/Battle-Royale-JUJU/" : "/"),
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
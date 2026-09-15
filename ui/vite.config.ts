import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [tsConfigPaths()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
    },
  },
  tanstackStart: {
    server: { entry: "src/server.ts" },
  },
  nitro: {
    preset: "cloudflare-worker",
    output: {
      dir: "dist",
    },
  },
});

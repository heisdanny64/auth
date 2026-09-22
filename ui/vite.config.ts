import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { spunApiPlugin } from "./src/server/apiPlugin";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    fs: {
      allow: ["..", "/app/applet"],
    },
  },
  define: {
    "process.env.TSS_ROUTER_BASEPATH": '""',
  },
  plugins: [spunApiPlugin(), tsConfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(distDir, "public");
const serverDir = path.join(distDir, "server");

async function runPostbuild() {
  try {
    // 1. Verify dist exists
    await fs.access(distDir);

    // 2. Copy public assets to dist root if publicDir exists
    try {
      await fs.access(publicDir);
      await fs.cp(publicDir, distDir, { recursive: true });
      console.log("[postbuild] Synchronized public assets to dist root.");
    } catch {
      console.warn("[postbuild] Public directory not found, skipping asset copy.");
    }

    // 3. Render or create fallback index.html
    let htmlContent = "";
    try {
      const ssrModulePath = path.join(serverDir, "_ssr", "ssr.mjs");
      await fs.access(ssrModulePath);
      const ssr = (await import(ssrModulePath)).default;
      if (ssr && typeof ssr.fetch === "function") {
        const res = await ssr.fetch(new Request("http://localhost/"));
        if (res && res.status < 400) {
          htmlContent = await res.text();
          console.log("[postbuild] Generated index.html via SSR renderer.");
        }
      }
    } catch (ssrErr) {
      console.warn("[postbuild] SSR render for index.html skipped:", ssrErr?.message || ssrErr);
    }

    // 4. Fallback HTML if SSR rendering did not produce content
    if (!htmlContent) {
      // Find the main client js bundle in dist/assets
      let clientScript = "/assets/index.js";
      try {
        const assetsDir = path.join(distDir, "assets");
        const files = await fs.readdir(assetsDir);
        const mainBundle = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
        if (mainBundle) {
          clientScript = `/assets/${mainBundle}`;
        }
      } catch {}

      htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spün Auth</title>
    <meta name="description" content="Authentication and account management for Spün" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${clientScript}"></script>
  </body>
</html>`;
      console.log("[postbuild] Generated fallback index.html template.");
    }

    await fs.writeFile(path.join(distDir, "index.html"), htmlContent, "utf-8");
    await fs.writeFile(path.join(publicDir, "index.html"), htmlContent, "utf-8");
    console.log("[postbuild] Build artifact preparation completed successfully.");
  } catch (err) {
    console.error("[postbuild] Error during postbuild:", err);
    process.exit(1);
  }
}

runPostbuild();

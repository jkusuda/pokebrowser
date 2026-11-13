import { defineConfig } from "vite";
import { resolve } from "path";

// Content scripts can't load chunks at runtime, so we build content.ts in
// isolation with inlineDynamicImports to produce a single self-contained file.
// The other entries (popup, background) ship as ES modules and can share chunks.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false, // Don't wipe popup/background built by the main config.
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        inlineDynamicImports: true,
        format: "iife",
      },
    },
  },
});

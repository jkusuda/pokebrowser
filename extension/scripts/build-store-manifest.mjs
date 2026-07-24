import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PROD_WEBSITE_URL = "https://www.pokebrowser.net";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const manifestPath = resolve(distDir, "manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

manifest.externally_connectable.matches = manifest.externally_connectable.matches.filter(
  (origin) => !origin.startsWith("http://localhost")
);

writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");

console.log("Stripped localhost from dist/manifest.json for the Web Store build.");

// Vite bakes extension/.env's VITE_WEBSITE_URL into the compiled bundles as a
// literal string (used for the login/profile deep links). If a dev has a
// local .env pointing at localhost (the documented local-testing setup),
// that literal ends up in dist/assets/*.js too — the manifest patch above
// doesn't touch it. Rewrite it here so store builds always deep-link to prod
// regardless of what's in the developer's local .env.
const assetsDir = resolve(distDir, "assets");
let patchedFiles = 0;
for (const file of readdirSync(assetsDir)) {
  if (!file.endsWith(".js")) continue;
  const filePath = resolve(assetsDir, file);
  const contents = readFileSync(filePath, "utf8");
  if (!contents.includes("http://localhost:3000")) continue;
  writeFileSync(filePath, contents.replaceAll("http://localhost:3000", PROD_WEBSITE_URL));
  patchedFiles += 1;
}

console.log(
  patchedFiles > 0
    ? `Rewrote localhost -> ${PROD_WEBSITE_URL} in ${patchedFiles} compiled bundle(s).`
    : "No localhost references found in compiled bundles."
);

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const manifestPath = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

manifest.externally_connectable.matches = manifest.externally_connectable.matches.filter(
  (origin) => !origin.startsWith("http://localhost")
);

writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");

console.log("Stripped localhost from dist/manifest.json for the Web Store build.");

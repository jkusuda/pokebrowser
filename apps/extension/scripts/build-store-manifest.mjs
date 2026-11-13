import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, "../dist");
const manifestPath = resolve(distDir, "manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// After an update the extension opens <site>/whats-new?v=<manifest version> (src/lib/update-notice.ts),
// so the manifest version needs a matching changelog entry.
const updatesPath = resolve(scriptDir, "../../web/src/data/updates.json");
const latestNotes = JSON.parse(readFileSync(updatesPath, "utf8")).updates[0];

if (latestNotes?.version !== manifest.version) {
  console.error(
    `Version mismatch: manifest.json is ${manifest.version} but the newest ` +
      `apps/web/src/data/updates.json entry is ${latestNotes?.version ?? "(none)"}.\n` +
      `Add the ${manifest.version} changelog entry (or fix the manifest) before building for the store.`
  );
  process.exit(1);
}

manifest.externally_connectable.matches = manifest.externally_connectable.matches.filter(
  (origin) => !origin.startsWith("http://localhost")
);

writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");

console.log("Stripped localhost from dist/manifest.json for the Web Store build.");

// Every URL is baked into the bundles at build time, so refuse to ship a build that points at a local stack.
const assetsDir = resolve(distDir, "assets");
const bundles = readdirSync(assetsDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => [file, readFileSync(resolve(assetsDir, file), "utf8")]);

const local = bundles.filter(([, contents]) => /localhost:(3000|3002|8080)|127\.0\.0\.1/.test(contents));
if (local.length > 0) {
  console.error(`Local URLs found in ${local.map(([file]) => file).join(", ")}. Remove any apps/extension/.env overrides and rebuild.`);
  process.exit(1);
}

const apiUrl = bundles.map(([, contents]) => contents.match(/https:\/\/api\.[a-z.]+/)?.[0]).find(Boolean);
console.log(`Store build ready: dist/ (version ${manifest.version}, API ${apiUrl ?? "not found"}).`);

// GTA VI Trophy Guide — build entry.
// Copies app/ and screenshots/ into the output directory, then writes
// dossier.json with make.fun's frontend dossier library (vendor copy, unchanged).
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts   (defaults to /output)
import { buildDossier } from "./vendor/makefun-frontend.ts";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const appSrc = join(rootDir, "app");
const shotsSrc = join(rootDir, "screenshots");
const appDst = join(outDir, "app");
const shotsDst = join(outDir, "screenshots");
const dossierPath = join(outDir, "dossier.json");

mkdirSync(outDir, { recursive: true });
for (const p of [appDst, shotsDst, dossierPath]) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}
cpSync(appSrc, appDst, { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, shotsDst, { recursive: true });

// Caps from the bounty gate: text 160 KiB, 4 screenshots of at most 256 KiB,
// app/ at most 993 entries and 48 MiB, paths at most 1,000 UTF-8 bytes.
// Only text_max_bytes shapes the dossier bytes; the rest only refuse input.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossier);
console.log("wrote " + dossierPath + " (" + dossier.length + " bytes)");

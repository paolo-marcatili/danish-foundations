#!/usr/bin/env node
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve(process.argv[2] ?? "content-packs/hy-eastern-it");
const packId = path.basename(source);
const destination = path.resolve(process.argv[3] ?? path.join("apps", "web", "public", "content-packs", packId));

await mkdir(path.dirname(destination), { recursive: true });
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (entry.name === "sources") continue;
  await cp(path.join(source, entry.name), path.join(destination, entry.name), {
    recursive: true,
    force: true
  });
}

console.log(`Synced ${packId} to ${path.relative(process.cwd(), destination)}`);

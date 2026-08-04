import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const siteDir = path.join(root, "site");
const sharedEnvironment = {
  ...process.env,
  GITHUB_PAGES: "true",
  VITE_ARMENIAN_APP_URL: "/hero-language-camp/armenian/",
  VITE_DANISH_APP_URL: "/hero-language-camp/danish/"
};

await runNpm(["run", "build"], {
  ...sharedEnvironment,
  GITHUB_PAGES_BASE: "/hero-language-camp/armenian/",
  VITE_STORAGE_NAMESPACE: "hy-eastern-it"
});

await runNpm(["run", "build:danish"], {
  ...sharedEnvironment,
  GITHUB_PAGES_BASE: "/hero-language-camp/danish/",
  VITE_STORAGE_NAMESPACE: "da-foundations"
});

await rm(siteDir, { recursive: true, force: true });
await mkdir(path.join(siteDir, "armenian"), { recursive: true });
await mkdir(path.join(siteDir, "danish"), { recursive: true });
await cp(path.join(root, "deployment", "site-root"), siteDir, { recursive: true });
await cp(path.join(root, "apps", "web", "dist"), path.join(siteDir, "armenian"), { recursive: true });
await cp(path.join(root, "apps", "danish-foundations", "dist"), path.join(siteDir, "danish"), { recursive: true });

console.log("Unified site assembled in", siteDir);

function runNpm(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: root,
      env,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm ${args.join(" ")} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
    });
  });
}

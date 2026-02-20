import { dirname, join } from "@std/path";
import * as esbuild from "esbuild";

import { CORE_MODULES, HYPR_MODULES } from "./runtime.ts";

const args = Deno.args;
const command = args[0];

function createHyprExternalsPlugin(): esbuild.Plugin {
  const allModules = {
    ...CORE_MODULES,
    "@hypr/store": HYPR_MODULES["@hypr/store"],
    "@hypr/tabs": HYPR_MODULES["@hypr/tabs"],
    hyprnote: { global: "__hyprnote" },
  };

  return {
    name: "hypr-externals",
    setup(build) {
      for (const moduleName of Object.keys(allModules)) {
        const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filter = new RegExp(`^${escaped}$`);
        build.onResolve({ filter }, () => ({
          path: moduleName,
          namespace: "hypr-global",
        }));
      }

      build.onResolve({ filter: /^@hypr\/ui/ }, (args) => ({
        path: args.path,
        namespace: "hypr-global",
      }));

      build.onLoad({ filter: /.*/, namespace: "hypr-global" }, (args) => {
        const moduleConfig = allModules[args.path as keyof typeof allModules];
        if (moduleConfig) {
          return {
            contents: `module.exports = window.${moduleConfig.global}`,
            loader: "js",
          };
        }

        if (args.path.startsWith("@hypr/ui")) {
          const subpath = args.path.replace("@hypr/ui", "").replace(/^\//, "");
          if (subpath) {
            return {
              contents: `module.exports = window.${HYPR_MODULES["@hypr/ui"].global}["${subpath}"]`,
              loader: "js",
            };
          }
          return {
            contents: `module.exports = window.${HYPR_MODULES["@hypr/ui"].global}`,
            loader: "js",
          };
        }

        return { contents: "module.exports = {}", loader: "js" };
      });
    },
  };
}

function getExtensionsDir(): string {
  const os = Deno.build.os;
  const appId = "com.hyprnote.dev";
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";

  if (os === "darwin") {
    return join(home, "Library", "Application Support", appId, "extensions");
  } else if (os === "linux") {
    return join(home, ".local", "share", appId, "extensions");
  } else if (os === "windows") {
    return join(home, "AppData", "Roaming", appId, "extensions");
  }
  throw new Error(`Unsupported platform: ${os}`);
}

function log(
  message: string,
  type: "info" | "success" | "warn" | "error" = "info",
) {
  const prefix: Record<string, string> = {
    info: "\x1b[36m[INFO]\x1b[0m",
    success: "\x1b[32m[SUCCESS]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m",
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

function printUsage() {
  console.log(`
Usage: deno task <command> [extension-name]

Commands:
  build [name]     Build extension(s). If name is omitted, builds all extensions.
  clean [name]     Remove dist folder(s). If name is omitted, cleans all extensions.
  install [name]   Copy extension(s) to app data directory for development.
                   If name is omitted, installs all extensions.

Examples:
  deno task build                 # Build all extensions
  deno task build:calendar        # Build only calendar extension
  deno task clean                 # Clean all extensions
  deno task install               # Install all extensions for development
`);
}

function exists(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

interface Panel {
  id: string;
  entry: string;
  styles?: string;
}

interface Manifest {
  panels?: Panel[];
}

async function buildStyles(
  extensionDir: string,
  inputFile: string,
  outputFile: string,
): Promise<boolean> {
  const inputPath = join(extensionDir, inputFile);
  const outputPath = join(extensionDir, outputFile);
  const outputDir = dirname(outputPath);

  if (!exists(inputPath)) {
    return true;
  }

  if (!exists(outputDir)) {
    Deno.mkdirSync(outputDir, { recursive: true });
  }

  log(`  Styles: ${inputFile} -> ${outputFile}`);

  const command = new Deno.Command("npx", {
    args: ["tailwindcss", "-i", inputPath, "-o", outputPath, "--minify"],
    cwd: extensionDir,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stderr } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    log(`Failed to build styles: ${errorText}`, "error");
    return false;
  }

  return true;
}

async function buildExtension(name: string): Promise<boolean> {
  const baseDir = getExtensionsBaseDir();
  const extensionDir = join(baseDir, name);
  const manifestPath = join(extensionDir, "extension.json");

  if (!exists(manifestPath)) {
    log(`Extension manifest not found: ${manifestPath}`, "error");
    return false;
  }

  let manifest: Manifest;
  try {
    const raw = Deno.readTextFileSync(manifestPath);
    manifest = JSON.parse(raw);
  } catch (err) {
    log(
      `Failed to read/parse manifest ${manifestPath}: ${(err as Error).message}`,
      "error",
    );
    return false;
  }

  log(`Building extension: ${name}`);

  for (const panel of manifest.panels || []) {
    const entryFile = panel.entry.replace("dist/", "").replace(".js", ".tsx");
    const entryPath = join(extensionDir, entryFile);

    if (!exists(entryPath)) {
      log(`Panel entry not found: ${entryPath}, skipping...`, "warn");
      continue;
    }

    const outfile = join(extensionDir, panel.entry);
    const outdir = dirname(outfile);

    if (!exists(outdir)) {
      Deno.mkdirSync(outdir, { recursive: true });
    }

    log(`  Panel ${panel.id}: ${entryFile} -> ${panel.entry}`);

    try {
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        outfile,
        format: "iife",
        globalName: "__hypr_panel_exports",
        platform: "browser",
        target: "es2020",
        jsx: "automatic",
        plugins: [createHyprExternalsPlugin()],
        minify: false,
        sourcemap: true,
      });

      if (result.errors && result.errors.length > 0) {
        log(`Failed to build panel ${panel.id}:`, "error");
        for (const error of result.errors) {
          console.error(error);
        }
        return false;
      }
    } catch (err) {
      log(
        `Error building panel ${panel.id}: ${(err as Error).message}`,
        "error",
      );
      return false;
    }

    if (panel.styles) {
      const stylesInput = panel.styles
        .replace("dist/", "")
        .replace(".css", ".css");
      const stylesInputPath = stylesInput.startsWith("dist/")
        ? stylesInput.slice(5)
        : stylesInput;
      const sourceStyles = stylesInputPath.replace(/^dist\//, "");
      const stylesSuccess = await buildStyles(
        extensionDir,
        sourceStyles,
        panel.styles,
      );
      if (!stylesSuccess) {
        return false;
      }
    }
  }

  log(`Built extension: ${name}`, "success");
  return true;
}

function getExtensionDirs(): string[] {
  const baseDir = getExtensionsBaseDir();
  const entries = [...Deno.readDirSync(baseDir)];
  return entries
    .filter(
      (entry) =>
        entry.isDirectory &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        entry.name !== "shared" &&
        exists(join(baseDir, entry.name, "extension.json")),
    )
    .map((entry) => entry.name);
}

function getExtensionsBaseDir(): string {
  return dirname(dirname(new URL(import.meta.url).pathname));
}

async function buildAll(): Promise<boolean> {
  const extensions = getExtensionDirs();
  log(`Found ${extensions.length} extension(s): ${extensions.join(", ")}`);

  let success = true;
  for (const name of extensions) {
    const result = await buildExtension(name);
    if (!result) success = false;
  }
  return success;
}

function cleanExtension(name: string) {
  const baseDir = getExtensionsBaseDir();
  const distPath = join(baseDir, name, "dist");
  if (exists(distPath)) {
    Deno.removeSync(distPath, { recursive: true });
    log(`Cleaned: ${name}/dist`, "success");
  } else {
    log(`Nothing to clean: ${name}/dist`, "info");
  }
}

function cleanAll() {
  const extensions = getExtensionDirs();
  for (const name of extensions) {
    cleanExtension(name);
  }
}

function copyRecursive(src: string, dest: string) {
  const entries = [...Deno.readDirSync(src)];
  for (const entry of entries) {
    if (entry.name === "node_modules") {
      continue;
    }
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory) {
      Deno.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      Deno.copyFileSync(srcPath, destPath);
    }
  }
}

function installExtension(name: string): boolean {
  const baseDir = getExtensionsBaseDir();
  const extensionDir = join(baseDir, name);
  const manifestPath = join(extensionDir, "extension.json");

  if (!exists(manifestPath)) {
    log(`Extension not found: ${name}`, "error");
    return false;
  }

  const targetDir = join(getExtensionsDir(), name);

  if (exists(targetDir)) {
    Deno.removeSync(targetDir, { recursive: true });
  }
  Deno.mkdirSync(targetDir, { recursive: true });

  copyRecursive(extensionDir, targetDir);
  log(`Installed: ${name} -> ${targetDir}`, "success");
  return true;
}

function installAll() {
  const extensions = getExtensionDirs();
  log(`Installing ${extensions.length} extension(s) to ${getExtensionsDir()}`);

  for (const name of extensions) {
    installExtension(name);
  }
}

async function main() {
  const extensionName = args[1];

  switch (command) {
    case "build":
      if (extensionName) {
        const success = await buildExtension(extensionName);
        if (!success) Deno.exit(1);
      } else {
        const success = await buildAll();
        if (!success) Deno.exit(1);
      }
      break;

    case "clean":
      if (extensionName) {
        cleanExtension(extensionName);
      } else {
        cleanAll();
      }
      break;

    case "install":
      if (extensionName) {
        installExtension(extensionName);
      } else {
        installAll();
      }
      break;

    case "help":
    case "--help":
    case "-h":
      printUsage();
      break;

    default:
      if (command && !command.startsWith("-")) {
        log(`Building extension: ${command} (legacy usage)`, "info");
        const success = await buildExtension(command);
        if (!success) Deno.exit(1);
      } else if (!command) {
        const success = await buildAll();
        if (!success) Deno.exit(1);
      } else {
        printUsage();
        Deno.exit(1);
      }
  }

  void esbuild.stop();
}

main().catch((err) => {
  log(`Unexpected error: ${(err as Error).message}`, "error");
  Deno.exit(1);
});

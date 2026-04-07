import archiver from "archiver";
import { build, context } from "esbuild";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const watchMode = process.argv.includes("--watch");
const releaseMode = process.argv.includes("--release");

if (watchMode && releaseMode) {
  throw new Error("--watch and --release cannot be used together.");
}

const sharedConfig = {
  entryPoints: [path.join(projectRoot, "src/module.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: path.join(projectRoot, "scripts/module.mjs"),
  sourcemap: true,
  logLevel: "info"
};

const releaseAssets = [
  "lang",
  "packs",
  "scripts",
  "styles",
  "templates",
  "README.md",
  "LICENSE"
];

async function readJsonFile(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getRepositoryUrl(packageJson) {
  const repository = typeof packageJson.repository === "string"
    ? packageJson.repository
    : packageJson.repository?.url;

  if (!repository) {
    throw new Error("package.json repository.url is required to prepare a release.");
  }

  return repository.replace(/^git\+/, "").replace(/\.git$/, "");
}

function buildReleaseManifest(moduleJson, repositoryUrl) {
  const versionTag = `v${moduleJson.version}`;

  return {
    ...moduleJson,
    manifest: `${repositoryUrl}/releases/latest/download/module.json`,
    download: `${repositoryUrl}/releases/download/${versionTag}/${moduleJson.id}.zip`,
    license: "LICENSE",
    changelog: `${repositoryUrl}/releases`
  };
}

async function ensureFileExists(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  await access(filePath);
}

async function buildModule() {
  await build(sharedConfig);
}

async function collectReleaseAssets() {
  const assets = [];

  for (const relativePath of releaseAssets) {
    const absolutePath = path.join(projectRoot, relativePath);

    try {
      const assetStats = await stat(absolutePath);
      assets.push({
        absolutePath,
        relativePath,
        isDirectory: assetStats.isDirectory()
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        console.warn(`[traveller-scenes] Skipping missing release asset: ${relativePath}`);
        continue;
      }

      throw error;
    }
  }

  return assets;
}

async function createReleaseArchive({ moduleJson, releaseManifest }) {
  const distDir = path.join(projectRoot, "dist");
  const archivePath = path.join(distDir, `${moduleJson.id}.zip`);
  const manifestPath = path.join(distDir, "module.json");
  const assets = await collectReleaseAssets();

  await mkdir(distDir, { recursive: true });
  await writeFile(`${manifestPath}`, `${JSON.stringify(releaseManifest, null, 2)}\n`, "utf8");

  await new Promise((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => {
      if (error.code === "ENOENT") {
        console.warn(`[traveller-scenes] Skipping missing release asset: ${error.message}`);
        return;
      }

      reject(error);
    });
    archive.on("error", reject);

    archive.pipe(output);
    archive.append(`${JSON.stringify(releaseManifest, null, 2)}\n`, { name: "module.json" });

    for (const asset of assets) {
      if (asset.isDirectory) {
        archive.directory(asset.absolutePath, asset.relativePath);
      } else {
        archive.file(asset.absolutePath, { name: asset.relativePath });
      }
    }

    archive.finalize().catch(reject);
  });

  console.log(`[traveller-scenes] Release manifest: ${path.relative(projectRoot, manifestPath)}`);
  console.log(`[traveller-scenes] Release archive: ${path.relative(projectRoot, archivePath)}`);
  console.log(`[traveller-scenes] Upload both files to the GitHub release for v${moduleJson.version}.`);
}

async function prepareRelease() {
  const [packageJson, moduleJson] = await Promise.all([
    readJsonFile("package.json"),
    readJsonFile("module.json")
  ]);

  if (packageJson.version !== moduleJson.version) {
    throw new Error(
      `package.json version (${packageJson.version}) must match module.json version (${moduleJson.version}) before preparing a release.`
    );
  }

  await Promise.all([
    ensureFileExists("README.md"),
    ensureFileExists("LICENSE")
  ]);

  await buildModule();

  const repositoryUrl = getRepositoryUrl(packageJson);
  const releaseManifest = buildReleaseManifest(moduleJson, repositoryUrl);
  await createReleaseArchive({ moduleJson, releaseManifest });
}

if (watchMode) {
  const watchContext = await context(sharedConfig);
  await watchContext.watch();
  console.log("[traveller-scenes] Watching for source changes...");
} else if (releaseMode) {
  await prepareRelease();
} else {
  await buildModule();
}

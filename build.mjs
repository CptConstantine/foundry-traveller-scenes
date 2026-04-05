import { build, context } from "esbuild";

const watchMode = process.argv.includes("--watch");

const sharedConfig = {
  entryPoints: ["src/module.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "scripts/module.mjs",
  sourcemap: true,
  logLevel: "info"
};

if (watchMode) {
  const watchContext = await context(sharedConfig);
  await watchContext.watch();
  console.log("[traveller-scenes] Watching for source changes...");
} else {
  await build(sharedConfig);
}

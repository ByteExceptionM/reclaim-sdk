import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  sourcemap: false,
  target: "node20",
  platform: "node",
  splitting: false,
  treeshake: true,
  minify: false,
});

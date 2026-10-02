import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    target: "node18",
    outExtension({ format }) {
        return {
        js: format === "esm" ? ".mjs" : ".cjs",
        };
    },
});

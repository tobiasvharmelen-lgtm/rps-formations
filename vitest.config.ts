import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "shared/src"),
    },
  },
});

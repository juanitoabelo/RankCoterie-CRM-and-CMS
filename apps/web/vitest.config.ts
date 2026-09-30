import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mts"],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "modules/**/*.test.ts", "components/**/*.dom.test.tsx"],
    exclude: [
      "**/*.integration.test.ts",
      "**/*.verify.test.ts",
    ],
  },
});
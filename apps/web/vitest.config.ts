import react from "@vitejs/plugin-react";
import type { ViteUserConfig } from "vitest/config";

const vitestConfig: ViteUserConfig = {
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: ["./test/setup.ts"],
  },
};

export default vitestConfig;

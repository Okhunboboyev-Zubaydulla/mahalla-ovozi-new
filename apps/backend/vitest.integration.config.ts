import type { ViteUserConfig } from "vitest/config";

const integrationConfig: ViteUserConfig = {
  test: {
    fileParallelism: false,
    include: ["test/integration/**/*.integration.test.ts"],
    maxWorkers: 1,
    sequence: {
      concurrent: false,
    },
  },
};

export default integrationConfig;

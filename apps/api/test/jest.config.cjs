/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: "..",
  testMatch: ["<rootDir>/test/**/*.spec.ts", "<rootDir>/test/**/*.e2e-spec.ts"],
  globalSetup: "<rootDir>/test/global-setup.cjs",
  setupFiles: ["<rootDir>/test/env.cjs"],
  maxWorkers: 1,
  testTimeout: 90000,
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
};

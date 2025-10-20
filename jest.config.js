module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^globby$": "<rootDir>/test/__mocks__/globby.js",
    "^execa$": "<rootDir>/test/__mocks__/execa.js",
    "^@octokit/rest$": "<rootDir>/test/__mocks__/@octokit/rest.js",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};

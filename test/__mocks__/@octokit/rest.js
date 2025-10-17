// Mock for @octokit/rest to avoid ES module parsing issues in Jest
module.exports = {
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      git: {
        getRef: jest.fn(),
        getCommit: jest.fn(),
        createTree: jest.fn(),
        createCommit: jest.fn(),
        updateRef: jest.fn(),
        createBlob: jest.fn(),
      },
      repos: {
        get: jest.fn(),
      },
    },
  })),
};

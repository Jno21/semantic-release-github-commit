// Mock for execa - used in Jest tests
module.exports = {
  execa: jest.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0,
  }),
};

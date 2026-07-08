// Tests exercise the auth/CORS logic directly (not by importing index.js,
// which side-effects app.listen() on import), so index.js itself shows 0%
// coverage — a hard threshold on it would always fail. Report only.
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['index.js', '!node_modules/**']
};

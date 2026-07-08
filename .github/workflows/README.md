# GitHub Actions Workflows

## test.yml
- Runs on: push to main, PRs to main
- Tests on Node.js 18.x, 20.x, 22.x
- Installs deps, runs npm test, generates coverage
- Optional: uploads coverage to Codecov

## lint.yml
- Runs on: push to main, PRs to main
- Syntax check on index.js
- Verifies .env.example exists
- Quick fail on obvious errors before tests run

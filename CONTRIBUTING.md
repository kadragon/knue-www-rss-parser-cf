# Contributing to KNUE RSS Parser

Thank you for your interest in contributing! This document outlines our development practices and security guidelines.

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- Cloudflare account with Workers enabled
- Wrangler CLI (`npm install -g @cloudflare/wrangler`)

### Setup
```bash
git clone https://github.com/kadragon/knue-www-rss-parser-cf
cd knue-www-rss-parser-cf
npm install
```

### Branch Convention
Use feature branches from `main`:
```bash
git checkout -b feat/your-feature-name
git checkout -b fix/your-bug-fix
git checkout -b docs/your-docs-improvement
git checkout -b refactor/your-refactoring
```

Do NOT work directly on `main`.

---

## Development Workflow

### 1. Understand the Specification
- Read `.spec/rss-parser/rss-parser.spec.md` for acceptance criteria
- Check `.tasks/TASKS.md` for ongoing tasks and improvements

### 2. Write Tests First (TDD)
```bash
# Create failing test
npm test -- test/your-test.test.ts

# Implement minimum code to pass
npm run lint && npm run typecheck
```

### 3. Ensure Quality
```bash
# Local validation
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Unit & integration tests
npm run test:coverage  # Check coverage thresholds (90/90/75/90)

# Local worker simulation
npm run dev
curl "http://localhost:8787/__scheduled?cron=0+16+*+*+*"
```

### 4. Commit with Clear Messages
Format: `[Type] (scope) summary [task-id]`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code structure improvement
- `test`: Test additions/updates
- `docs`: Documentation
- `chore`: Build, dependencies, etc.
- `[Structural]`: Architecture changes (AGENTS policy)

**Examples:**
```bash
git commit -m "feat(fetcher): add retry logic with exponential backoff"
git commit -m "fix(parser): handle edge case in entity decoding"
git commit -m "[Structural] (spec) establish canonical RSS parser spec"
```

### 5. Push & Create Pull Request
```bash
git push origin feat/your-feature-name
```

**Before merging:**
- ✅ All tests pass
- ✅ Coverage thresholds met (90/90/75/90)
- ✅ No secrets in code
- ✅ Pre-commit hook passed

---

## Security Practices

### Secrets Management

**DO NOT commit:**
- `.env` or `.env.local` files
- API tokens, keys, passwords
- Private credentials
- Sensitive configuration

**SAFE to commit:**
- `.env.example` (template with placeholder values)
- Configuration templates
- Public documentation

### Pre-commit Checks
Before committing, the pre-commit hook automatically:
1. Scans staged files for sensitive patterns
2. Runs ESLint
3. Runs TypeScript type checking

If the hook fails, the commit is blocked. Example:
```bash
$ git commit -m "fix: add new feature"
❌ Pre-commit check failed: Sensitive data detected in staged files
Please ensure .env, .env.local, and sensitive credentials are not committed
```

### Dependency Security
- Dependencies must have no moderate or higher vulnerabilities
- Run `npm audit` locally to check: `npm audit --audit-level=moderate`
- Regularly update dependencies: `npm update`

### Code Review
- All PRs require code review before merge
- Focus on:
  - Security implications
  - Test coverage
  - Performance impact
  - Breaking changes

---

## Code Style

- **TypeScript** with `strict: true`
- **No comments** unless explaining complex logic
- **Function length**: < 50 lines
- **Module separation**: By domain (rss/, markdown/, storage/, etc.)

### Linting Rules
ESLint configuration: `.eslintrc.json`
```bash
npm run lint      # Check
npm run lint:fix  # Auto-fix
```

---

## Testing Requirements

### Unit Tests
- Test single functions in isolation
- Mock external dependencies
- Use deterministic tests (no time/randomness without injection)

### Integration Tests
- Test workflows across multiple modules
- Mock Cloudflare R2 and Workers APIs
- Cover multi-board scenarios

### Coverage Thresholds
Must meet all of:
- **Statements:** 90%
- **Functions:** 90%
- **Branches:** 75%
- **Lines:** 90%

Check locally:
```bash
npm run test:coverage
```

---

## Documentation

### Update Documentation When:
- Adding/modifying features
- Changing configuration options
- Updating deployment procedures

### Key Documents
- `README.md`: User-facing guide
- `.spec/rss-parser/rss-parser.spec.md`: Technical specification
- `.agents/`: Operational policies
- `.tasks/TASKS.md`: Improvement backlog

---

## Deployment

Deployment is handled manually via Cloudflare through the Wrangler CLI:
```bash
npm run deploy
```

This requires Cloudflare credentials configured locally (via `wrangler login` or environment variables).

---

## Questions or Issues?

- Check existing issues/discussions
- Review `.agents/` for policies and decisions
- Refer to `.spec/` for acceptance criteria
- Ask in pull request comments

---

## License

By contributing, you agree your code will be licensed under the ISC License.

# Tasks — KNUE RSS Parser Improvements

> Identified improvement areas from project review (2025-10-17)

---

## High Priority

### TASK-001: Fix Documentation/Config Inconsistency
**Status:** Pending  
**Priority:** High  
**Estimated Effort:** 5 minutes

**Issue:**
- README.md states cron runs at `0 1 * * *` (UTC 1AM = KST 10AM)
- wrangler.jsonc actually configured as `0 16 * * *` (UTC 4PM = KST 1AM next day)

**Action:**
- [ ] Update README.md line 156 to match actual schedule: `0 16 * * *` (UTC 4PM = KST 1AM)
- [ ] OR update wrangler.jsonc cron to `0 1 * * *` if KST 10AM is intended

**Files:**
- README.md:156
- wrangler.jsonc:13

---

## Medium Priority

### TASK-002: Plan ESLint 9 & typescript-eslint v8 Migration
**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 4-6 hours (future task)

**Current Status:**
- Currently using ESLint 8.57.1 and typescript-eslint v6
- Both at latest within v8/v6 respectively
- Uses legacy `.eslintrc.json` config format

**Breaking Changes:**
- ESLint 9 requires new `eslint.config.js` (flat config) format
- typescript-eslint v8 requires ESLint v9
- Rules configuration significantly changed (e.g., `ban-types` removed)
- `.eslintrc.json` format no longer supported

**Decision:** Keep current versions for now; plan dedicated migration task when bandwidth available

**Migration Path (Future):**
1. Review ESLint 9 flat config migration guide
2. Create new `eslint.config.js` with typescript-eslint presets
3. Migrate rules configuration from `.eslintrc.json`
4. Update test setup if needed
5. Full testing and validation
6. Delete old `.eslintrc.json`

**References:**
- https://eslint.org/docs/latest/use/migrate-to-9.0.0
- https://typescript-eslint.io/blog/announcing-typescript-eslint-v8
- https://eslint.org/docs/latest/use/configure/configuration-files

---

### TASK-003: Establish Spec Structure
**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 1 hour

**Issue:**
- `.spec/` directory does not exist
- Specification documents only in `.tasks/knue-rss-parser/SPEC-DELTA.md`
- Violates AGENTS policy: ".spec/ defines the truth"

**Action:**
- [ ] Create `.spec/rss-parser/` directory
- [ ] Move/refactor `.tasks/knue-rss-parser/SPEC-DELTA.md` → `.spec/rss-parser/rss-parser.spec.md`
- [ ] Document:
  - RSS feed contract (XML structure, fields)
  - R2 storage path contract (`rss/{board_id}/{yyyy}_{mm}_{dd}_{article_id}.md`)
  - Markdown output format
  - Error handling behavior (partial failure allowed)
- [ ] Update `.tasks/knue-rss-parser/SPEC-DELTA.md` to reference canonical spec
- [ ] Commit with: `[Structural] (spec) Establish canonical RSS parser specification`

---

### TASK-004: Add Test Coverage Reporting & Goals
**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 20 minutes

**Action:**
- [ ] Run `npm run test:coverage` and review current coverage
- [ ] Set coverage thresholds in `vitest.config.ts`:
  ```typescript
  coverage: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80
  }
  ```
- [ ] Add coverage badge to README.md (optional)
- [ ] Document coverage requirements in CONTRIBUTING.md or README
- [ ] Commit with: `test(config): add coverage thresholds and reporting`

---

## Low Priority

### TASK-005: Add CI/CD Pipeline
**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 2 hours

**Issue:**
- No `.github/workflows/` automation
- Manual testing/deployment only

**Action:**
- [ ] Create `.github/workflows/test.yml`:
  - Run on PR and push to main
  - Execute `npm run lint`, `npm run typecheck`, `npm test`
  - Check coverage thresholds
- [ ] Create `.github/workflows/deploy.yml`:
  - Deploy to Cloudflare Workers on merge to main
  - Requires `CLOUDFLARE_API_TOKEN` secret
- [ ] Document workflow in README.md
- [ ] Commit with: `ci: add GitHub Actions for testing and deployment`

---

### TASK-006: Add Development Environment Example
**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 10 minutes

**Action:**
- [ ] Create `.env.example`:
  ```
  # RSS Feed Configuration (set in wrangler.jsonc for production)
  RSS_FEED_BASE_URL=https://www.knue.ac.kr/rssBbsNtt.do
  BOARD_IDS=25,26,11,207,28,256
  ```
- [ ] Document local development setup in README.md
- [ ] Commit with: `docs: add .env.example for local development`

---

### TASK-007: Improve Error Handling & Observability
**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 1-2 hours

**Improvements:**
- Add retry logic for transient network failures (exponential backoff)
- Emit structured logs/metrics via Cloudflare Workers Analytics Engine
- Track per-board success/failure rates over time
- Alert on consecutive failures

**Action:**
- [ ] Research Cloudflare Workers Analytics Engine integration
- [ ] Implement retry logic in `src/rss/fetcher.ts`
- [ ] Add structured logging with success/failure metrics
- [ ] Document observability approach in README or `.agents/`
- [ ] Commit with: `feat(observability): add retry logic and structured metrics`

---

### TASK-008: Add Security Scanning
**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 30 minutes

**Action:**
- [ ] Add pre-commit hook for secrets detection (e.g., `detect-secrets`, `git-secrets`)
- [ ] Add `npm audit` check to CI pipeline
- [ ] Document security practices in CONTRIBUTING.md
- [ ] Commit with: `chore(security): add secrets scanning and audit checks`

---

### TASK-009: Refactor Long Function in index.ts
**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 30 minutes

**Issue:**
- `src/index.ts:30-71` has complex board processing loop (42 lines)

**Action:**
- [ ] Extract to `async function processBoardBatch(boardIds, env)`
- [ ] Return structured result: `{ totalSaved, totalErrors, results[] }`
- [ ] Keep `scheduled()` handler minimal (orchestration only)
- [ ] Add unit tests for `processBoardBatch()`
- [ ] Commit with: `refactor(index): extract board batch processing to separate function`

---

## Completed

_(No completed tasks yet)_

---

## Notes

- All tasks follow AGENTS policy (RSP-I workflow, branch naming, commit conventions)
- High/Medium priority tasks should be done first
- Each task should be on a separate feature branch
- Tests must pass before merging
- Document architectural decisions in `.agents/` if policy-relevant

---

**Last Updated:** 2025-10-17  
**Review Cycle:** Monthly or when significant changes occur

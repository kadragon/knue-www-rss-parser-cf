# Operational Plan — KNUE RSS Parser

_Last updated: 2025-10-19 (UTC+09:00)_

## Execution Flow
1. Cron trigger (`0 16 * * *`) invokes `scheduled()`.
2. Split `BOARD_IDS` → iterate boards, fetch RSS with retry guard.
3. Parse XML → enrich attachment previews (if preview service configured).
4. Convert feed slice to Markdown and persist to R2 (`writeToR2`).
5. Log per-board summary and aggregate totals (saved vs failed).

## Module Responsibilities
- `src/index.ts`: orchestration, logging, error fan-out.
- `src/rss/fetcher.ts`: timeout, retry policy (3 attempts, 2x backoff).
- `src/rss/parser.ts`: CDATA handling, attachment extraction, articleId derivation.
- `src/rss/enricher.ts` + `src/preview/fetcher.ts`: preview API integration.
- `src/markdown/*`: HTML→Markdown conversion + preview section formatting.
- `src/storage/r2-writer.ts`: idempotent writes, metadata, key generation.
- `src/utils/datetime.ts`: ISO + KST formatting, R2 key helper.

## Guard Rails (TDD)
- Run `npm test` and `npm run test -- --coverage` when adjusting RSS parsing/markdown output.
- Update fixtures when RSS schema changes; promote spec examples into tests.
- Ensure preview fetcher tests cover timeout and API error responses.
- Maintain coverage thresholds (90/90/75/90).

## Change Checklist
- [ ] Update `.spec/rss-parser/rss-parser.spec.md` when altering contracts (RSS fields, Markdown schema, R2 key format).
- [ ] Document new env vars in `wrangler.jsonc` + SPEC.
- [ ] Add regression tests for new failure modes.
- [ ] Record progress in `.tasks/knue-rss-parser/PROGRESS.md` (Red/Green state).

## Rollback Strategy
1. Redeploy previous Worker version via `wrangler deploy --version <id>`.
2. Restore prior `wrangler.jsonc` and policy docs from git history.
3. Validate by re-running scheduled job locally (`wrangler dev --test-scheduled`).

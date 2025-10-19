# SPEC DELTA: KNUE RSS Parser

> Canonical reference: `.spec/rss-parser/rss-parser.spec.md` (v1.1.0).

---

## Current Status (2025-10-19)
- **Spec version:** 1.2.0 (preview enrichment + two-year retention)
- **Implementation:** Fully aligned ✅
- **Last validation:** `npm test -- --run` @ 2025-10-19T04:21:56Z

### Acceptance Criteria Tracking
- ✅ **AC-1** Scheduled execution logged with duration + totals.
- ✅ **AC-2** Multi-board fetch with timeout + retry (verified in `test/rss/fetcher.test.ts`).
- ✅ **AC-3** RSS parsing (CDATA, attachments, articleId extraction) — `test/rss/parser*.test.ts`.
- ✅ **AC-4** Markdown conversion with preview/download aggregation — `test/markdown/converter.test.ts`.
- ✅ **AC-5** R2 persistence idempotency — `test/storage/r2-writer.test.ts`.
- ✅ **AC-6** Preview enrichment graceful degradation — `test/preview/fetcher.test.ts`, integration scenarios.
- ✅ **AC-7** Observability behavior — asserted via integration tests logging expectations.
- ✅ **AC-8** Two-year retention (ingest skip + R2 cleanup) — `test/integration/workflow.test.ts` ("should skip items older than two years", "should delete articles older than two years from storage").

### Test Inventory
| Suite | Tests | Notes |
| --- | --- | --- |
| `test/rss/fetcher.test.ts` | 5 | Retry + timeout logic |
| `test/rss/parser.test.ts` | 10 | Core XML parsing scenarios |
| `test/rss/parser-entity-decode.test.ts` | 3 | HTML entity decoding guard |
| `test/markdown/converter.test.ts` | 10 | Markdown contract (preview/download aggregation) |
| `test/markdown/html-converter.test.ts` | 8 | html-to-text conversion cases |
| `test/storage/r2-writer.test.ts` | 8 | Idempotent R2 writes |
| `test/preview/fetcher.test.ts` | 3 | Preview API response handling |
| `test/utils/datetime.test.ts` | 7 | ISO + KST formatting, key generation |
| `test/integration/workflow.test.ts` | 9 | Multi-board workflows + failure handling |

- **Unit tests:** 54 (sum of first seven suites)
- **Integration tests:** 9 (`test/integration/workflow.test.ts`)
- **Total executed:** 63 (Vitest v3.2.4)
- **Coverage gate:** 90/90/75/90 configured (run `npm run test:coverage` on change-touching parser or converter modules).

### Recent Changes Impacting Spec
- Enforced two-year retention window: skip stale items pre-save and purge aged R2 artefacts.
- Replaced `turndown` with `html-to-text` (Workers-safe Markdown conversion).
- Added preview enrichment contract and env vars to canonical spec.
- Documented aggregate preview/download sections in Markdown output.

### Open Questions / Future Work
- TASK-002: ESLint 9 migration once flat config guidance for Workers stabilises.
- TASK-011: Structured metrics + alerting (requires Analytics Engine provisioning).

### References
- Spec: `.spec/rss-parser/rss-parser.spec.md`
- Tests: `test/**` (see inventory above)
- Implementation: `src/index.ts`, `src/rss/*`, `src/markdown/*`, `src/storage/r2-writer.ts`, `src/preview/fetcher.ts`, `src/utils/datetime.ts`

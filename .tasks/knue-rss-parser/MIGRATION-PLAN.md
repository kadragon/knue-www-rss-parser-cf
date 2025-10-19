# Dependency Decision — html-to-text

_Recorded: 2025-10-18 (Updated 2025-10-19)_

## Summary
- Replaced `turndown` + `linkedom` with `html-to-text@^9.0.5` for HTML→Markdown conversion inside Cloudflare Workers.
- Added `@types/html-to-text` for full type coverage.
- No breaking contract changes; markdown output parity validated via existing tests.

## Rationale
- `html-to-text` is DOM-free and Workers-compatible (no `document` requirement).
- Smaller bundle size and lower cold-start overhead compared with linkedom + turndown combo.
- Handles Korean text and inline links without custom adapters.

## Verification
- Updated unit tests: `test/markdown/html-converter.test.ts`, `test/integration/workflow.test.ts`.
- Manual spot-check using exported markdown files for board 25.

## Follow-up
- Monitor upstream for markdown-specific options that keep headings bold formatting.
- Revisit if html-to-text introduces breaking change in v10 (add to TASK-002 watch list).

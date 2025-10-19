# Research Summary — KNUE RSS Parser

_Last reviewed: 2025-10-19 (UTC+09:00)_

## Architecture Snapshot
- Cloudflare Worker runs on cron `0 16 * * *` (executes 01:00 Asia/Seoul next day).
- Multi-board processing via `BOARD_IDS` env var; default boards: `25,26,11,207,28,256`.
- Preview enrichment optional: requires `PREVIEW_PARSER_BASE_URL` + `PREVIEW_PARSER_TOKEN`.
- Markdown stored per article in R2 at `rss/{boardId}/{yyyy}_{mm}_{dd}_{articleId}.md`.

## RSS Feed Characteristics
- Source URL pattern: `https://www.knue.ac.kr/rssBbsNtt.do?bbsNo={boardId}`.
- Items expose CDATA wrapped title, description (HTML), department (optional).
- Attachments follow numbered triplets (`filenameN`, `urlN`, `previewN`); preview IDs derived from `atchmnflNo` query param.
- `pubDate` uses `YYYY-MM-DD` (assumed Asia/Seoul timezone).

## Conversion & Storage Notes
- HTML descriptions translated to Markdown using `html-to-text` with 80 character soft wrap.
- Preview API (if configured) returns Markdown fragments inserted under `### 미리보기`.
- Deduplication occurs by probing R2 key before write; duplicates result in skip with structured logs.

## Known Constraints & Risks
- Preview API failure leaves attachment metadata intact but omits preview content (logged per attachment).
- RSS feed occasionally omits `department`; markdown omits empty label.
- R2 keys depend on `pubDate`; malformed date raises error (`generateR2Key`).

## Evidence
- Source of truth: `src/index.ts`, `src/rss/*`, `src/markdown/*`, `src/storage/r2-writer.ts`, `src/preview/fetcher.ts`.
- Fixtures: `fixtures/sample-rss.xml`, `fixtures/sample-rss-escaped.xml`.
- Tests: `test/rss/*.test.ts`, `test/markdown/*.test.ts`, `test/storage/r2-writer.test.ts`, `test/preview/fetcher.test.ts`, `test/integration/workflow.test.ts`.

## Open Questions
- Do we need automated alerts for repeated board failures (>3 consecutive days)?
- Should preview fetch retries mirror RSS fetch backoff policy?

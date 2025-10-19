---
id: SPEC-RSS-PARSER-001
version: 1.1.0
scope: global
status: active
last-updated: 2025-10-19
owner: team-admin
---

# KNUE RSS Parser Specification (v1.1.0)

## Overview
- Cloudflare Worker that archives KNUE board RSS feeds on a daily schedule.
- Fetches multiple boards, enriches attachments with preview content when available, converts to Markdown, and stores artefacts in Cloudflare R2.
- Built in TypeScript, deployed via Wrangler; operates entirely within Workers runtime (no Node-specific APIs).

## Acceptance Criteria

### AC-1 — Scheduled Execution
**Given** the Worker is deployed with cron trigger `0 16 * * *` (UTC)  
**When** the clock reaches 16:00 UTC (01:00 Asia/Seoul next day)  
**Then** the `scheduled()` handler executes once per day and logs start/end markers including duration and totals.

### AC-2 — Board Fetch & Retry
**Given** `BOARD_IDS` contains a comma-separated list of board identifiers  
**When** the job runs  
**Then** each board issues an HTTP GET to `RSS_FEED_BASE_URL?bbsNo=<boardId>` with:
- Timeout: 5 000 ms per attempt
- Retries: up to 3 attempts with exponential backoff (multiplier 2, max delay 10 000 ms)
- Failures logged with board context; final failure continues processing remaining boards.

### AC-3 — RSS Parsing
**Given** a successful RSS XML response  
**When** the parser runs  
**Then** it produces a feed structure:
- Feed: `title`, `link`, `description`
- Items (array) containing:
  - `title`, `link`, `description` (HTML inside CDATA)
  - `pubDate` (`YYYY-MM-DD` assumed Asia/Seoul)
  - `department` (optional, may be empty)
  - `attachments[]`
    - `filename`, `downloadUrl`, `previewUrl`
    - `previewId` derived from `atchmnflNo` query param when present
- `articleId` obtained from `nttNo` query parameter in the item link.
- HTML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, `&apos;`) decoded in all string fields.
- Invalid or missing channel/item nodes raise an error.

### AC-4 — Markdown Generation
**Given** a parsed feed and execution timestamp  
**When** Markdown is generated  
**Then** output follows this structure:

````markdown
# {feed.title}
**Source**: {feed.link}  
**Description**: {feed.description}  
**Generated**: {timestampUTC} ({timestampKST})

**Preview URLs:**
- {filename}: {previewUrl}

**Download URLs:**
- {filename}: {downloadUrl}

---

## [{item.title}]({item.link})
**Published**: {pubDate}  
**Department**: {department}

{html-to-text output}

### 미리보기
{preview markdown blocks}

---
````

Rules:
- Aggregated preview/download sections appear once at top; duplicates filtered by URL.
- `Department` line omitted if source value is empty.
- HTML descriptions converted using `html-to-text` with 80 character word wrap and trimmed result.
- Preview blocks rendered only when preview API returns `content` (Markdown snippet per attachment).
- Final document trimmed with trailing newline removed.

### AC-5 — R2 Persistence
**Given** Markdown for a single item  
**When** saving to R2  
**Then** the Worker:
- Writes to key `rss/{boardId}/{yyyy}_{mm}_{dd}_{articleId}.md` (date derived from `pubDate`).
- Skips writing if `head()` indicates the object already exists, logging as duplicate.
- Stores with `Content-Type: text/markdown; charset=utf-8` and default metadata.
- Surfaces an error if `pubDate` is malformed (prevents silent mis-filing).

### AC-6 — Preview Enrichment (Optional)
**Given** both `PREVIEW_PARSER_BASE_URL` and `PREVIEW_PARSER_TOKEN` are present  
**When** an attachment includes a `previewId`  
**Then** the Worker fetches preview content via `GET {baseUrl}?atchmnflNo={previewId}` with Bearer token header:
- Timeout: 5 000 ms; abort on expiry.
- Response JSON must contain `{ success: true, content: string }`.
- Failures log warnings and leave attachments unchanged (no job failure).
- Preview Markdown appended under `### 미리보기` for the corresponding item.

If preview config is missing, attachments remain without preview content and job still succeeds.

### AC-7 — Observability & Error Handling
- Per-board log lines capture fetch, parse, save, and skip counts.
- Aggregate summary prints total saved vs failed and total duration.
- Job throws only when all boards fail or unexpected errors bubble up.

## Data Contracts

### RSSItem
| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | HTML entities decoded |
| `link` | string | Absolute URL containing `nttNo` |
| `description` | string | Raw HTML from feed |
| `pubDate` | string | `YYYY-MM-DD` (Seoul timezone) |
| `department` | string | Optional, may be empty |
| `articleId` | string | Derived from `link` query param |
| `attachments[]` | `RSSAttachment[]` | Zero or more |

### RSSAttachment
| Field | Type | Notes |
| --- | --- | --- |
| `filename` | string | Cleaned of leading whitespace/hyphen |
| `downloadUrl` | string | Direct download link |
| `previewUrl` | string | Optional; may be empty |
| `previewId` | string? | Extracted from `previewUrl` query |
| `previewContent` | string? | Markdown returned by preview API |

## Preview API Contract
- Method: `GET {PREVIEW_PARSER_BASE_URL}?atchmnflNo=<id>`
- Headers: `Authorization: Bearer {PREVIEW_PARSER_TOKEN}`
- Success payload: `{ "success": true, "content": "<markdown>" }`
- Failure payload: `{ "success": false, "error": "reason" }`
- Non-200 responses or `success !== true` treated as soft failures.

## Dependencies
| Package | Version | Purpose |
| --- | --- | --- |
| `fast-xml-parser` | ^5.3.0 | RSS XML parsing with CDATA support |
| `html-to-text` | ^9.0.5 | HTML → Markdown conversion (Workers safe) |
| `@types/html-to-text` | ^9.0.4 | Type definitions |
| `date-fns-tz` | ^3.2.0 | ISO + Asia/Seoul formatting |

## Environment Variables
| Name | Required | Example | Description |
| --- | --- | --- | --- |
| `RSS_FEED_BASE_URL` | Yes | `https://www.knue.ac.kr/rssBbsNtt.do` | Base URL for all boards |
| `BOARD_IDS` | Yes | `25,26,11,207,28,256` | Comma-delimited board identifiers |
| `PREVIEW_PARSER_BASE_URL` | No | `https://preview.example.workers.dev/` | Preview API endpoint |
| `PREVIEW_PARSER_TOKEN` | No | `***` | Bearer token for preview API |

## Quality Gates
- Test runner: `vitest`
- Minimum coverage: Statements ≥90%, Branches ≥75%, Functions ≥90%, Lines ≥90% (enforced in `vitest.config.ts`).
- Critical suites: `test/rss/*.test.ts`, `test/markdown/*.test.ts`, `test/storage/*.test.ts`, `test/preview/*.test.ts`, `test/integration/workflow.test.ts`.
- Local smoke test: `wrangler dev --test-scheduled` or manual `__scheduled` trigger per board.

## Operational Notes
- Duplicate detection relies on preflight `bucket.head(key)` calls; ensure R2 API limits handled.
- Logging uses emoji markers (`✓`, `⚠`, `❌`) for quick scanning in Workers tail output.
- Preview failures should not prevent other attachments or boards from completing.

## Version History
| Version | Date | Summary |
| --- | --- | --- |
| 1.1.0 | 2025-10-19 | Added preview enrichment spec, html-to-text dependency, clarified cron + logging requirements. |
| 1.0.0 | 2025-10-17 | Initial canonical specification. |

---
id: SPEC-RSS-PARSER-001
version: 1.0.0
scope: global
status: active
last-updated: 2025-10-17
owner: team-admin
---

# RSS Parser Specification

**Canonical source of truth for KNUE RSS archival system.**

---

## Overview

Worker application that:
1. Fetches RSS feeds from KNUE boards on a scheduled cron (daily at 1:00 AM Asia/Seoul)
2. Parses RSS XML and extracts articles, metadata, and attachments
3. Converts HTML content to Markdown
4. Stores artifacts in Cloudflare R2

---

## Acceptance Criteria

### AC-1: Scheduled Execution
- **Given:** Worker deployed with cron trigger  
- **When:** Clock reaches 1:00 AM Asia/Seoul (UTC 4PM previous day)  
- **Then:** `scheduled()` handler executes automatically

**Cron Expression:** `0 16 * * *` (UTC)

### AC-2: RSS Fetch
- **Given:** KNUE board RSS feed URL configured  
- **When:** Scheduled job runs  
- **Then:** Worker fetches feed via HTTP GET  
- **And:** Handles network errors gracefully (timeout, 404, 5xx)

**Timeout:** 5 seconds per request  
**URL Pattern:** `https://www.knue.ac.kr/rssBbsNtt.do?bbsNo={boardId}`

### AC-3: RSS Parsing
- **Given:** Valid RSS XML response  
- **When:** Parser processes content  
- **Then:** Extracts:

#### Feed Level
- `title` (CDATA or plain text)
- `link` (URL)
- `description` (CDATA or plain text)

#### Per-Item Level
- `title` (CDATA)
- `link` (CDATA, contains `nttNo=` parameter for article ID extraction)
- `description` (HTML in CDATA)
- `pubDate` (ISO date string, assumed Asia/Seoul timezone)
- `department` (optional CDATA field)
- `attachments[]` (0 to N files):
  - `filename{N}` (e.g., `filename1`, `filename2`)
  - `url{N}` (download URL)
  - `preview{N}` (preview/thumbnail URL)

**Article ID Extraction:** Parse `nttNo=(\d+)` from link URL

**HTML Entity Decoding:** Handle `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, `&apos;`

### AC-4: Markdown Conversion
- **Given:** Parsed RSS data  
- **When:** Converter generates Markdown  
- **Then:** Produces valid `.md` with:

#### Format
```markdown
# [Feed Title]
**Source:** {feed-link}  
**Description:** {feed-description}  
**Generated:** {timestamp-utc} ({timestamp-kst})

**Preview URLs:**
- filename1: preview-url1

**Download URLs:**
- filename1: download-url1

---

## [Item Title](item-link)
**Published:** YYYY-MM-DD (Asia/Seoul)  
**Department:** {department}

{html-as-markdown-content}

### 미리보기
{preview-markdown-blocks}

---
```

**Rules:**
- When one or more attachments provide `previewUrl`, list unique entries under a `**Preview URLs:**` section using the format `filename: url`.
- Always list download links under a `**Download URLs:**` section using the format `filename: url`.
- Feed metadata at top (title, source, description, timestamp)
- Each item as H2 section
- HTML description converted to Markdown (via Turndown)
- Department line omitted if empty
- If preview content is available (fetched via preview worker), insert a `### 미리보기` section after the HTML description and append each preview block verbatim (already Markdown-formatted by the worker).
- Sections separated by `---`

### AC-5: R2 Storage
- **Given:** Generated Markdown content  
- **When:** Worker writes to R2  
- **Then:** Stores with:

#### Key Pattern
```
rss/{boardId}/{yyyy}_{mm}_{dd}_{articleId}.md
```

**Example:** `rss/25/2025_10_16_77561.md`

#### Metadata
- `Content-Type: text/markdown; charset=utf-8`
- Strong consistency guarantee
- Idempotent (existing files not overwritten, skipped)

#### Duplicate Detection
- Check file existence via `bucket.head(key)` before write
- Return `{ saved: false, reason: 'exists', key }` if duplicate
- Return `{ saved: true, reason: 'new', key }` on success

### AC-6: Multi-Board Processing
- **Given:** Multiple board IDs configured  
- **When:** Scheduled job runs  
- **Then:** Process each board sequentially  
- **And:** Continue if one board fails (partial failure allowed)
- **But:** Fail overall if ALL boards fail

**Board Configuration:** Comma-separated list in `BOARD_IDS` env var

**Example:** `BOARD_IDS=25,26,11,207,28,256`

### AC-7: Error Handling
- **Given:** Any step fails (fetch, parse, convert, store)  
- **When:** Error occurs  
- **Then:**
  - Log error with board ID and context
  - Continue processing remaining boards
  - Return error status only if 100% boards fail

**Error Scenarios:**
- Network timeout: Log and skip board
- Invalid XML: Log parse error and skip board
- R2 write failure: Log and skip board
- All boards failed: Throw error

### AC-8: Local Testing
- **Given:** Worker runs locally  
- **When:** Triggered via `npm run dev` + `curl "http://localhost:8787/__scheduled?cron=0+16+*+*+*"`  
- **Then:** Full workflow executes with mock/test resources

---

## Non-Functional Requirements

### NFR-1: Performance
- Total execution time < 10 seconds (6 boards × ~5 articles each)
- RSS fetch timeout: 5 seconds per request
- R2 operations: < 100ms per file

### NFR-2: Reliability
- No data loss on transient failures
- Idempotent operations (re-running same day skips existing files)
- Strong consistency on R2 writes

### NFR-3: Observability
- Console logs for each major step (fetch, parse, save)
- Error logs include full context (board ID, URL, message)
- Success summary: total saved, total boards failed

### NFR-4: Maintainability
- TypeScript with strict mode (`strict: true`)
- All functions < 50 LOC
- Test coverage for core logic (>80%)
- Module separation: fetcher, parser, converter, r2-writer

---

## Data Contracts

### RSS Input Contract (XML Structure)
```xml
<rss version="2.0">
  <channel>
    <title><![CDATA[Title]]></title>
    <link>https://example.com</link>
    <description><![CDATA[Description]]></description>
    <item>
      <title><![CDATA[Article Title]]></title>
      <link><![CDATA[https://...?nttNo=12345]]></link>
      <pubDate><![CDATA[2025-10-16]]></pubDate>
      <department><![CDATA[Department Name]]></department>
      <description><![CDATA[<p>HTML content</p>]]></description>
      <filename1><![CDATA[file.pdf]]></filename1>
      <url1><![CDATA[https://download/file.pdf]]></url1>
      <preview1><![CDATA[https://preview/file.jpg]]></preview1>
    </item>
  </channel>
</rss>
```

### Markdown Output Contract
```markdown
# Feed Title
**Source:** https://example.com  
**Description:** Description  
**Generated:** 2025-10-16T16:00:00Z (2025-10-17T01:00:00+09:00)

---

## [Article Title](https://...?nttNo=12345)
**Published:** 2025-10-16 (Asia/Seoul)  
**Department:** Department Name

HTML content converted to Markdown

### 첨부파일
- [file.pdf](https://download/file.pdf)

---
```

### R2 Storage Contract
- **Path:** `rss/{boardId}/{yyyy}_{mm}_{dd}_{articleId}.md`
- **Type:** `text/markdown; charset=utf-8`
- **Encoding:** UTF-8
- **Idempotency:** File existence check before write

---

## Dependencies

| Name | Version | Rationale |
|------|---------|-----------|
| fast-xml-parser | ^5.3.0 | Lightweight XML parsing with CDATA support |
| turndown | ^7.2.0 | HTML to Markdown conversion |
| date-fns-tz | ^3.2.0 | Timezone-aware date manipulation (UTC ↔ Asia/Seoul) |
| linkedom | ^0.18.12 | Server-side DOM for HTML processing in Workers |

---

## Environment Variables

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `RSS_FEED_BASE_URL` | URL | `https://www.knue.ac.kr/rssBbsNtt.do` | Yes |
| `BOARD_IDS` | CSV | `25,26,11,207,28,256` | Yes |

---

## Test Fixtures

### Valid Single-Item RSS
File: `fixtures/sample-rss.xml`
- Single board, 3 items, 2 attachments per item
- Valid CDATA sections
- All fields populated

### RSS with Entity-Encoded Text
File: `fixtures/sample-rss-escaped.xml`
- HTML entity encoding (`&lt;`, `&gt;`, etc.)
- Mixed CDATA and plain text fields
- Tests entity decoding logic

---

## Acceptance Test Examples

### Example 1: Single Board Success
```typescript
// Input: Board 25 with 5 articles
// Output: 5 markdown files saved to rss/25/{date}_{articleId}.md
// Result: { saved: 5, failed: 0 }
```

### Example 2: Multi-Board with Partial Failure
```typescript
// Input: 6 boards, board 3 network timeout
// Output: 5 boards processed, board 3 skipped
// Result: { saved: 25, failed: 1 }  ← continues, not errored
```

### Example 3: Duplicate Detection
```typescript
// Input: Run job twice same day
// First run: saves 5 files
// Second run: skips 5 files (exists check), result { saved: 0, skipped: 5 }
```

### Example 4: Invalid XML
```typescript
// Input: Malformed XML from board 2
// Output: Board 2 logs parse error, continues with others
// Result: { saved: 20, failed: 1 }  ← continues
```

---

## Open Items

- [ ] Implement retry logic for transient failures (exponential backoff)
- [ ] Add structured metrics to Cloudflare Analytics Engine
- [ ] Define failure notification mechanism (email/webhook)
- [ ] Performance profiling at scale (100+ boards)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-17 | Initial canonical specification |

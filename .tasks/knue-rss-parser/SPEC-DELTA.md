# SPEC DELTA: KNUE RSS Parser

## Acceptance Criteria

### AC-1: Scheduled Execution
**Given** the Worker is deployed with a cron trigger  
**When** the clock reaches 1:00 AM UTC  
**Then** the `scheduled()` handler executes automatically

### AC-2: RSS Fetch
**Given** the KNUE board RSS feed URL is configured  
**When** the scheduled job runs  
**Then** the Worker fetches the RSS feed via HTTP GET  
**And** handles network errors gracefully (timeout, 404, 500, etc.)

### AC-3: RSS Parsing
**Given** a valid RSS XML response from KNUE  
**When** the parser processes the content  
**Then** it extracts:
- Feed title (from CDATA)
- Feed link
- Feed description (from CDATA)
- All item entries with:
  - Title (from CDATA)
  - Link (from CDATA)
  - Description (HTML content in CDATA)
  - Publication date (YYYY-MM-DD format, assume KST)
  - Department (custom field, may be empty)
  - File attachments (0 to N):
    - Filename (filename1, filename2, ...)
    - Download URL (url1, url2, ...)
    - Preview URL (preview1, preview2, ...)

### AC-4: Markdown Conversion
**Given** parsed RSS data  
**When** the converter generates Markdown  
**Then** it produces a valid `.md` file with:
- Feed metadata (title, link, description, generated timestamp)
- Each item formatted as:
  ```markdown
  ## [Item Title](item-link)
  **Published**: YYYY-MM-DD (KST)  
  **Department**: department-name (if present)
  
  item-description-content (HTML converted to Markdown)
  
  ### 첨부파일
  - [filename1](download-url1)
  - [filename2](download-url2)
  
  ---
  ```
- HTML in description field is converted to Markdown
- Attachments section is omitted if no files

### AC-5: R2 Storage
**Given** generated Markdown content  
**When** the Worker writes to R2  
**Then** it stores the file with:
- Key pattern: `YYYY/MM/DD.md` (based on run date in KST)
- Content-Type: `text/markdown; charset=utf-8`
- Strong consistency guarantee

### AC-6: Error Handling
**Given** any step fails (fetch, parse, convert, store)  
**When** an error occurs  
**Then** the Worker:
- Logs the error with context
- Does not crash
- Returns appropriate error status

### AC-7: Local Testing
**Given** the Worker runs locally via `wrangler dev --test-scheduled`  
**When** triggering `/__scheduled` endpoint  
**Then** the full workflow executes against local/test resources

## Non-Functional Requirements

### NFR-1: Performance
- Total execution time < 10 seconds
- RSS fetch timeout: 5 seconds

### NFR-2: Reliability
- No data loss on transient failures
- Idempotent operations (re-running same day overwrites)

### NFR-3: Observability
- Console logs for each major step
- Error logs include stack traces

### NFR-4: Maintainability
- TypeScript with strict mode
- All functions < 50 LOC
- 100% test coverage for core logic

## Dependencies

| Name | Latest | Chosen | Rationale | Link |
|------|--------|--------|-----------|------|
| fast-xml-parser | (TBD) | (TBD) | Lightweight, CDATA support, no native deps | (TBD) |
| turndown | (TBD) | (TBD) | HTML to Markdown conversion | (TBD) |
| date-fns-tz | (TBD) | (TBD) | Timezone conversion (UTC ↔ KST) | (TBD) |

## Open Items

- [x] Confirm KNUE RSS feed URL: `https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=25`
- [x] Decide: overwrite daily file (use YYYY/MM/DD.md pattern)
- [ ] Define failure notification mechanism (future enhancement)
- [ ] Determine max number of attachments (handle dynamically)

## Examples

### Example RSS Input (Actual KNUE Format)
```xml
<rss version="2.0">
  <channel>
    <title><![CDATA[ RSS - 대학소식 ]]></title>
    <link>https://www.knue.ac.kr</link>
    <description><![CDATA[ RSS - 대학소식 ]]></description>
    <item>
      <title><![CDATA[ 2024학년도 후기 학위수여식 안내 ]]></title>
      <link><![CDATA[ https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=77500 ]]></link>
      <pubDate><![CDATA[ 2025-10-15 ]]></pubDate>
      <department><![CDATA[ 교무처 ]]></department>
      <description><![CDATA[ <p>2024학년도 후기 학위수여식을 아래와 같이 안내합니다.</p> ]]></description>
      <filename1><![CDATA[ 행사 알림.jpg ]]></filename1>
      <url1><![CDATA[ https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76744 ]]></url1>
      <preview1><![CDATA[ https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76744 ]]></preview1>
      <filename2><![CDATA[ 행사 안내.hwp ]]></filename2>
      <url2><![CDATA[ https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76745 ]]></url2>
      <preview2><![CDATA[ https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76745 ]]></preview2>
    </item>
  </channel>
</rss>
```

### Example Markdown Output (Actual KNUE Format)
```markdown
# RSS - 대학소식
**Source**: https://www.knue.ac.kr  
**Description**: RSS - 대학소식  
**Generated**: 2025-10-17 01:00:00 UTC (2025-10-17 10:00:00 KST)

---

## [2024학년도 후기 학위수여식 안내](https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=77500)
**Published**: 2025-10-15 (KST)  
**Department**: 교무처

2024학년도 후기 학위수여식을 아래와 같이 안내합니다.

### 첨부파일
- [행사 알림.jpg](https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76744)
- [행사 안내.hwp](https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76745)

---
```

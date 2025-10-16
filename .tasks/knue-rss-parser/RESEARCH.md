# Research: KNUE RSS Parser System

## Goal
Build a Cloudflare Workers application that:
1. Fetches RSS feed from KNUE board
2. Parses RSS content
3. Converts to Markdown format
4. Stores in R2 bucket
5. Runs daily at 1:00 AM (scheduled via Cron Trigger)

## Technical Stack

### Cloudflare Workers
- Serverless edge computing platform
- V8 isolate runtime
- TypeScript/JavaScript support
- Built-in Cron Trigger support (scheduled events)

### Cloudflare R2
- S3-compatible object storage
- Workers API binding available
- No egress fees
- Strong consistency guarantees

### Cron Triggers
- UTC-based scheduling
- Format: Standard cron expression
- For 1:00 AM daily: `0 1 * * *`
- Uses `scheduled()` handler in Workers
- Test locally via `wrangler dev --test-scheduled`

## Architecture Components

### 1. Worker Entry Point
```typescript
export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    // Cron trigger handler
  }
}
```

### 2. R2 Binding
```jsonc
{
  "r2_buckets": [
    {
      "binding": "RSS_STORAGE",
      "bucket_name": "knue-rss-archive"
    }
  ]
}
```

### 3. Cron Configuration
```jsonc
{
  "triggers": {
    "crons": ["0 1 * * *"]  // Daily at 1:00 AM UTC
  }
}
```

## Workflow

1. **Trigger**: Cron fires at 1:00 AM UTC
2. **Fetch**: HTTP request to KNUE RSS feed URL
3. **Parse**: XML RSS → structured data
4. **Transform**: Structured data → Markdown format
5. **Store**: Write MD file to R2 with timestamp-based key
6. **Log**: Record operation status

## KNUE RSS Feed Analysis

### Feed URL
`https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=25`

### RSS Structure

#### Channel Level
```xml
<rss version="2.0">
  <channel>
    <title><![CDATA[ RSS - 대학소식 ]]></title>
    <link>https://www.knue.ac.kr</link>
    <description><![CDATA[ RSS - 대학소식 ]]></description>
  </channel>
</rss>
```

#### Item Structure (Standard Fields)
```xml
<item>
  <title><![CDATA[ ... ]]></title>
  <link><![CDATA[ ... ]]></link>
  <pubDate><![CDATA[ 2025-10-16 ]]></pubDate>
  <department><![CDATA[ ... ]]></department>
  <description><![CDATA[ HTML content ]]></description>
</item>
```

#### Item Structure (File Attachments)
Some items include file attachments with numbered fields:
```xml
<filename1><![CDATA[ 2024학년도 후기 학위수여식 행사 알림.jpg ]]></filename1>
<url1><![CDATA[ https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76744 ]]></url1>
<preview1><![CDATA[ https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76744 ]]></preview1>
<filename2><![CDATA[ ... ]]></filename2>
<url2><![CDATA[ ... ]]></url2>
<preview2><![CDATA[ ... ]]></preview2>
```

### Key Observations

1. **CDATA Wrapping**: All text content is wrapped in `<![CDATA[ ]]>`
2. **HTML in Description**: The `<description>` field contains HTML markup
3. **Date Format**: `YYYY-MM-DD` (no time component)
4. **Department Field**: Custom field (may be empty)
5. **File Attachments**: 
   - Numbered pattern: `filename1`, `url1`, `preview1`, `filename2`, etc.
   - Unknown max number of attachments
   - Each attachment has 3 fields: filename, download URL, preview URL
6. **Link Format**: Full URL with query parameters

## Key Technical Considerations

### RSS Parsing
- Need XML parser that handles CDATA sections (consider `fast-xml-parser` with CDATA support)
- Handle encoding (UTF-8, Korean characters)
- Extract standard fields: title, link, description, pubDate, department
- **NEW**: Dynamically detect and parse numbered attachment fields (filename1-N, url1-N, preview1-N)

### HTML Processing
- Description contains HTML markup
- Options:
  1. Strip HTML tags → plain text
  2. Convert HTML → Markdown (using library like `turndown`)
  3. Keep raw HTML (less readable in MD)
- **Decision needed**: Convert HTML to Markdown for better readability

### Markdown Conversion
- Template-based generation
- Escape special characters
- Preserve links and formatting
- Include metadata (generated date, source URL)
- **NEW**: Include file attachments section with download links

### R2 Storage Strategy
- Key format: `YYYY/MM/DD-HH-mm-ss.md` or `YYYY-MM-DD.md`
- Content-Type: `text/markdown; charset=utf-8`
- Optional: Add custom metadata
- **Decision**: Use `YYYY/MM/DD.md` for daily snapshots (overwrite if re-run same day)

### Error Handling
- Network timeout
- Invalid RSS format
- R2 write failures
- Rate limiting considerations
- **NEW**: Handle variable number of attachments gracefully

### Testing Strategy (TDD)
- Unit tests for parser
- Unit tests for MD converter
- Integration test for full flow
- Mock external dependencies (RSS feed, R2)
- **NEW**: Test cases for items with 0, 1, 2+ attachments

## Dependencies Research

### Required Libraries

1. **fast-xml-parser**
   - Purpose: Parse RSS XML with CDATA support
   - Features: Lightweight, handles CDATA, no native dependencies
   - Config needed: `ignoreAttributes: false`, `cdataPropName: "cdata"`

2. **turndown** (optional but recommended)
   - Purpose: Convert HTML description to Markdown
   - Preserves links, formatting
   - Cleaner output than regex-based stripping

3. **date-fns-tz**
   - Purpose: Timezone conversion (UTC ↔ KST)
   - Format dates consistently

## Updated Questions & Decisions

### ✅ Resolved
1. **KNUE RSS URL**: `https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=25`
2. **RSS Structure**: Analyzed, includes custom fields (department, attachments)
3. **Date Format**: `YYYY-MM-DD` (no timezone info, assume KST)

### ⚠️ Decisions Needed
1. **HTML Processing**: Convert to Markdown (recommended) vs strip tags?
2. **Attachment Handling**: 
   - Include download links in Markdown? (Yes, recommended)
   - Preview links needed? (Optional, can include as alternative)
3. **Retention Policy**: Keep all daily snapshots or rolling window?
4. **Notification**: Report failures? (Future enhancement)
5. **Deduplication**: Skip if content hasn't changed? (Future enhancement)

### 🔍 Technical Unknowns
1. **Max Attachments**: What's the highest number? (Need to scan or handle dynamically)
2. **Character Encoding**: Is UTF-8 consistent?
3. **Update Frequency**: How often does feed update? (Impacts daily snapshot strategy)

## Next Steps

1. ✅ Identify KNUE RSS feed URL
2. ✅ Analyze actual RSS structure
3. Update SPEC with actual field mappings
4. Update implementation plan with HTML→MD conversion
5. Add attachment parsing logic to plan
6. Decide on HTML processing approach
7. Set up Wrangler project structure

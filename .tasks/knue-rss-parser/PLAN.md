# Implementation Plan: KNUE RSS Parser

## Overview
Build a Cloudflare Worker that parses KNUE RSS feed and stores as Markdown in R2, triggered daily at 1:00 AM UTC.

## Prerequisites

1. **Cloudflare Account Setup**
   - R2 bucket created: `knue-rss-archive`
   - Workers plan enabled

2. **Development Tools**
   - Node.js >= 18.x
   - Wrangler CLI >= 3.x
   - TypeScript 5.x

## Project Structure

```
knue-www-rss-parser-cf/
├── src/
│   ├── index.ts                 # Main entry point (scheduled handler)
│   ├── rss/
│   │   ├── fetcher.ts           # RSS fetch logic
│   │   └── parser.ts            # RSS XML → data structure
│   ├── markdown/
│   │   └── converter.ts         # Data → Markdown
│   ├── storage/
│   │   └── r2-writer.ts         # R2 write operations
│   └── utils/
│       ├── datetime.ts          # Timezone utilities
│       └── logger.ts            # Logging helper
├── test/
│   ├── rss/
│   │   ├── fetcher.test.ts
│   │   └── parser.test.ts
│   ├── markdown/
│   │   └── converter.test.ts
│   └── integration/
│       └── workflow.test.ts
├── fixtures/
│   └── sample-rss.xml           # Test fixture
├── wrangler.jsonc               # Wrangler config
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

## Implementation Steps (TDD)

### Phase 1: Project Setup

#### Step 1.1: Initialize Wrangler Project
```bash
npm create cloudflare@latest knue-www-rss-parser-cf -- --type=hello-world --ts
cd knue-www-rss-parser-cf
```

#### Step 1.2: Install Dependencies
```bash
npm install fast-xml-parser turndown date-fns-tz
npm install -D @types/node vitest @cloudflare/workers-types
```

#### Step 1.3: Configure Wrangler
Update `wrangler.jsonc`:
```jsonc
{
  "name": "knue-rss-parser",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-15",
  "triggers": {
    "crons": ["0 1 * * *"]
  },
  "r2_buckets": [
    {
      "binding": "RSS_STORAGE",
      "bucket_name": "knue-rss-archive"
    }
  ],
  "vars": {
    "RSS_FEED_URL": "https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=25"
  }
}
```

#### Step 1.4: Configure TypeScript
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

### Phase 2: Core Logic (TDD)

#### Step 2.1: RSS Fetcher
**Test**: `test/rss/fetcher.test.ts`
- ✅ Fetches RSS from valid URL
- ✅ Returns XML string
- ✅ Handles network timeout (5s)
- ✅ Handles HTTP errors (404, 500)

**Implementation**: `src/rss/fetcher.ts`
```typescript
export async function fetchRSS(url: string): Promise<string>
```

#### Step 2.2: RSS Parser
**Test**: `test/rss/parser.test.ts`
- ✅ Parses valid RSS XML with CDATA sections
- ✅ Extracts feed metadata (title, link, description from CDATA)
- ✅ Extracts all items with standard fields
- ✅ Handles missing optional fields (department)
- ✅ Parses numbered attachment fields dynamically (filename1-N, url1-N, preview1-N)
- ✅ Handles items with 0, 1, 2+ attachments
- ✅ Throws on invalid XML

**Implementation**: `src/rss/parser.ts`
```typescript
export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;  // HTML content
  pubDate: string;      // YYYY-MM-DD format
  department?: string;
  attachments: RSSAttachment[];
}

export interface RSSAttachment {
  filename: string;
  downloadUrl: string;
  previewUrl: string;
}

export function parseRSS(xml: string): RSSFeed
```

#### Step 2.3: HTML to Markdown Converter
**Test**: `test/markdown/html-converter.test.ts`
- ✅ Converts HTML to Markdown using Turndown
- ✅ Preserves links and formatting
- ✅ Handles Korean text correctly
- ✅ Handles empty/null HTML

**Implementation**: `src/markdown/html-converter.ts`
```typescript
export function htmlToMarkdown(html: string): string
```

#### Step 2.4: Markdown Converter
**Test**: `test/markdown/converter.test.ts`
- ✅ Converts RSSFeed to Markdown string
- ✅ Includes feed metadata header (title, link, description, generated timestamp)
- ✅ Formats each item correctly (title, link, pubDate, department)
- ✅ Converts HTML description to Markdown
- ✅ Includes attachments section when present
- ✅ Omits attachments section when empty
- ✅ Handles empty items array

**Implementation**: `src/markdown/converter.ts`
```typescript
export function convertToMarkdown(feed: RSSFeed, generatedAt: Date): string
```

#### Step 2.5: R2 Writer
**Test**: `test/storage/r2-writer.test.ts` (with mocked R2Bucket)
- ✅ Writes content with correct key format
- ✅ Sets Content-Type header
- ✅ Returns success/failure status
- ✅ Handles R2 write errors

**Implementation**: `src/storage/r2-writer.ts`
```typescript
export async function writeToR2(
  bucket: R2Bucket,
  content: string,
  date: Date
): Promise<void>
```

#### Step 2.6: Date/Time Utilities
**Test**: `test/utils/datetime.test.ts`
- ✅ Converts UTC to KST
- ✅ Formats dates consistently (ISO)
- ✅ Generates R2 key path (YYYY/MM/DD.md)

**Implementation**: `src/utils/datetime.ts`
```typescript
export function utcToKST(date: Date): Date
export function formatDateISO(date: Date): string
export function generateR2Key(date: Date): string
```

### Phase 3: Integration

#### Step 3.1: Main Handler
**Test**: `test/integration/workflow.test.ts`
- ✅ Full workflow: fetch → parse → convert → store
- ✅ Uses mocked external dependencies
- ✅ Handles errors at each step

**Implementation**: `src/index.ts`
```typescript
interface Env {
  RSS_STORAGE: R2Bucket;
  RSS_FEED_URL: string;
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const now = new Date();
      
      const xml = await fetchRSS(env.RSS_FEED_URL);
      const feed = parseRSS(xml);
      const markdown = convertToMarkdown(feed, now);
      await writeToR2(env.RSS_STORAGE, markdown, now);
      
      console.log(`✅ RSS archived successfully at ${now.toISOString()}`);
    } catch (error) {
      console.error('❌ RSS archival failed:', error);
      throw error;
    }
  }
}
```

### Phase 4: Testing & Deployment

#### Step 4.1: Create Test Fixture
`fixtures/sample-rss.xml`: Sample KNUE RSS content with:
- CDATA sections
- HTML in description
- Multiple items (with and without attachments)
- Korean text

#### Step 4.2: Local Testing
```bash
# Run unit tests
npm test

# Run local worker with cron simulation
npx wrangler dev --test-scheduled

# Trigger manually
curl "http://localhost:8787/__scheduled?cron=0+1+*+*+*"
```

#### Step 4.3: Create R2 Bucket
```bash
npx wrangler r2 bucket create knue-rss-archive
```

#### Step 4.4: Deploy
```bash
npx wrangler deploy
```

#### Step 4.5: Verify Deployment
```bash
# Check cron triggers
npx wrangler deployments list

# Monitor logs
npx wrangler tail
```

## Rollback Strategy

If deployment fails:
1. Roll back to previous Worker version
2. Check R2 bucket permissions
3. Verify RSS feed URL accessibility
4. Review error logs via `wrangler tail`

## Monitoring

Post-deployment:
1. Monitor daily execution via Cloudflare dashboard
2. Check R2 bucket for daily files
3. Set up alerts for failed cron runs (if available)

## Future Enhancements

- Add deduplication (skip if content unchanged)
- Support multiple RSS feeds
- Email notification on failures
- Retention policy (auto-delete old files)
- Add search/index functionality

## Estimated Effort

- Setup & config: 30 min
- TDD implementation: 3-4 hours
- Testing & debugging: 1 hour
- Documentation: 30 min
- **Total**: ~5-6 hours

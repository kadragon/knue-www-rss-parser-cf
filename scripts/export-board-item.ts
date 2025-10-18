import { writeFile } from 'node:fs/promises';

import { fetchRSS } from '../src/rss/fetcher';
import { parseRSS } from '../src/rss/parser';
import { convertToMarkdown } from '../src/markdown/converter';
import { enrichItemWithPreview, getPreviewConfig } from '../src/rss/enricher';

const DEFAULT_RSS_TEMPLATE = 'https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=';
const DEFAULT_PREVIEW_BASE = 'https://knue-www-preview-parser-cf.kangdongouk.workers.dev/';

function resolveBoardId(): string | undefined {
  if (process.env.BOARD_ID) {
    return process.env.BOARD_ID;
  }

  if (process.env.RSS_URL) {
    try {
      const url = new URL(process.env.RSS_URL);
      return url.searchParams.get('bbsNo') ?? undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function resolveRssUrl(boardId: string | undefined): string {
  if (process.env.RSS_URL) {
    return process.env.RSS_URL;
  }

  if (boardId) {
    return `${DEFAULT_RSS_TEMPLATE}${boardId}`;
  }

  return `${DEFAULT_RSS_TEMPLATE}27`;
}

async function main(): Promise<void> {
  const boardId = resolveBoardId();
  const rssUrl = resolveRssUrl(boardId);

  console.log(`Fetching RSS feed: ${rssUrl}`);

  const xml = await fetchRSS(rssUrl, {
    timeoutMs: 5000,
    maxRetries: 3,
    backoffMultiplier: 2
  });

  const feed = parseRSS(xml);

  if (!feed.items.length) {
    console.error('No RSS items found in feed.');
    process.exit(1);
  }

  const previewConfig = getPreviewConfig({
    PREVIEW_PARSER_BASE_URL:
      process.env.PREVIEW_PARSER_BASE_URL ??
      process.env.PREVIEW_BASE_URL ??
      DEFAULT_PREVIEW_BASE,
    PREVIEW_PARSER_TOKEN:
      process.env.PREVIEW_PARSER_TOKEN ?? process.env.PREVIEW_TOKEN
  });

  if (!previewConfig) {
    console.error('PREVIEW_TOKEN (or PREVIEW_PARSER_TOKEN) environment variable is required.');
    process.exit(1);
  }

  const firstItem = feed.items[0];
  const enrichedItem = await enrichItemWithPreview(firstItem, previewConfig, { boardId });

  const now = new Date();
  const markdown = convertToMarkdown({ ...feed, items: [enrichedItem] }, now);
  const filename = `${enrichedItem.articleId}.txt`;

  await writeFile(filename, markdown, 'utf-8');

  console.log(`Saved markdown for article ${enrichedItem.articleId} to ${filename}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

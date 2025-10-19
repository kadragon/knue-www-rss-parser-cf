import { fetchRSS } from './rss/fetcher';
import type { RSSItem } from './rss/parser';
import { parseRSS } from './rss/parser';
import { convertToMarkdown } from './markdown/converter';
import { writeToR2 } from './storage/r2-writer';
import { enrichItemWithPreview, getPreviewConfig } from './rss/enricher';
import { extractDateOnly, getCutoffDateString, parseDateFromR2Key } from './utils/datetime';

interface Env {
  RSS_STORAGE: R2Bucket;
  RSS_FEED_BASE_URL: string;
  BOARD_IDS: string;
  PREVIEW_PARSER_BASE_URL?: string;
  PREVIEW_PARSER_TOKEN?: string;
}

interface BatchResult {
  totalSaved: number;
  totalErrors: number;
}

const RETENTION_YEARS = 2;
const R2_LIST_PAGE_SIZE = 1000;

async function saveArticlesToR2(
  bucket: R2Bucket,
  boardId: string,
  markdown: string,
  item: { pubDate: string; articleId: string }
): Promise<{ saved: boolean; skipped: boolean }> {
  const result = await writeToR2(bucket, markdown, boardId, item.pubDate, item.articleId);
  return {
    saved: result.saved,
    skipped: !result.saved
  };
}

function filterItemsByRetention(
  items: RSSItem[],
  retentionCutoff: string,
  boardId: string
): { retainedItems: RSSItem[]; expiredCount: number } {
  const retainedItems: RSSItem[] = [];
  let expiredCount = 0;

  for (const item of items) {
    const itemDate = extractDateOnly(item.pubDate);

    if (itemDate < retentionCutoff) {
      expiredCount++;
      console.log(
        `⚠ [Board ${boardId}] Skipping article ${item.articleId} (${itemDate}) older than retention cutoff ${retentionCutoff}`
      );
      continue;
    }

    retainedItems.push(item);
  }

  return { retainedItems, expiredCount };
}

async function purgeExpiredArticles(
  bucket: R2Bucket,
  boardId: string,
  now: Date
): Promise<number> {
  let cursor: string | undefined;
  let deletedCount = 0;
  const prefix = `rss/${boardId}/`;
  const retentionCutoff = getCutoffDateString(now, RETENTION_YEARS);

  let hasMore = true;

  while (hasMore) {
    const listResult = await bucket.list({
      prefix,
      cursor,
      limit: R2_LIST_PAGE_SIZE
    });

    for (const object of listResult.objects) {
      const objectDate = parseDateFromR2Key(object.key);

      if (!objectDate) {
        continue;
      }

      if (objectDate < retentionCutoff) {
        await bucket.delete(object.key);
        deletedCount++;
        console.log(`🗑️ [Board ${boardId}] Deleted expired article ${object.key}`);
      }
    }

    const nextCursor = 'cursor' in listResult ? listResult.cursor : undefined;
    hasMore = Boolean(listResult.truncated && nextCursor);
    cursor = hasMore ? nextCursor : undefined;
  }

  if (deletedCount > 0) {
    console.log(`🧹 [Board ${boardId}] Removed ${deletedCount} expired articles older than ${retentionCutoff}`);
  }

  return deletedCount;
}

async function processBoardBatch(
  boardIds: string[],
  env: Env,
  now: Date
): Promise<BatchResult> {
  let totalSaved = 0;
  let totalErrors = 0;

  for (const boardId of boardIds) {
    try {
      const url = `${env.RSS_FEED_BASE_URL}?bbsNo=${boardId}`;
      console.log(`\n🔄 [Board ${boardId}] Fetching RSS...`);

      const xml = await fetchRSS(url, {
        timeoutMs: 5000,
        maxRetries: 3,
        backoffMultiplier: 2
      });
      console.log(`✓ [Board ${boardId}] RSS feed fetched`);

      const feed = parseRSS(xml);
      console.log(`✓ [Board ${boardId}] Parsed ${feed.items.length} items`);

      const previewConfig = getPreviewConfig(env);
      const retentionCutoff = getCutoffDateString(now, RETENTION_YEARS);
      const { retainedItems, expiredCount } = filterItemsByRetention(feed.items, retentionCutoff, boardId);

      if (expiredCount > 0) {
        console.log(`⚠ [Board ${boardId}] Pruned ${expiredCount} items past retention window (${retentionCutoff})`);
      }

      if (retainedItems.length === 0) {
        console.log(`⚠ [Board ${boardId}] No items within retention window; skipping save step`);
      }

      const itemsWithPreview = await Promise.all(
        retainedItems.map(item => enrichItemWithPreview(item, previewConfig, { boardId }))
      );

      let savedCount = 0;
      let skippedCount = 0;

      for (const item of itemsWithPreview) {
        const markdown = convertToMarkdown({ ...feed, items: [item] }, now);
        const { saved, skipped } = await saveArticlesToR2(env.RSS_STORAGE, boardId, markdown, item);

        if (saved) {
          savedCount++;
        } else if (skipped) {
          skippedCount++;
        }
      }

      console.log(`✓ [Board ${boardId}] Saved ${savedCount} articles, skipped ${skippedCount} duplicates`);
      totalSaved += savedCount;

      await purgeExpiredArticles(env.RSS_STORAGE, boardId, now);
    } catch (error) {
      totalErrors++;
      console.error(`❌ [Board ${boardId}] Failed:`, error instanceof Error ? error.message : error);
    }
  }

  return { totalSaved, totalErrors };
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    try {
      console.log(`[${now.toISOString()}] Starting RSS archival job...`);

      const boardIds = env.BOARD_IDS.split(',').map(id => id.trim());
      console.log(`📋 Processing ${boardIds.length} boards: ${boardIds.join(', ')}`);

      const { totalSaved, totalErrors } = await processBoardBatch(boardIds, env, now);

      const duration = Date.now() - startTime;
      console.log(`\n✅ RSS archival completed in ${duration}ms`);
      console.log(`📊 Total: ${totalSaved} articles saved, ${totalErrors} boards failed`);

      if (totalErrors > 0 && totalSaved === 0) {
        throw new Error(`All boards failed to process`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ RSS archival job failed after ${duration}ms:`, error);

      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }

      throw error;
    }
  }
};

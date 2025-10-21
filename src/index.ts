import { fetchRSS } from './rss/fetcher';
import type { RSSItem } from './rss/parser';
import { parseRSS } from './rss/parser';
import { convertToMarkdown } from './markdown/converter';
import { writeToR2 } from './storage/r2-writer';
import { enrichItemWithPreview, getPreviewConfig } from './rss/enricher';
import { extractDateOnly, getCutoffDateString, parseDateFromR2Key } from './utils/datetime';

interface Env {
  RSS_STORAGE: R2Bucket;
  RSS_TRACKER: KVNamespace;
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
const R2_DELETE_CHUNK_SIZE = 1000;

async function getLastProcessedId(kv: KVNamespace, boardId: string): Promise<number> {
  const key = `rss-tracker:${boardId}`;
  const value = await kv.get(key);
  if (!value) {
    return 0;
  }
  const numericId = parseInt(value, 10);
  if (isNaN(numericId)) {
    console.warn(`[Board ${boardId}] Invalid lastProcessedId in KV: "${value}", resetting to 0`);
    return 0;
  }
  return numericId;
}

async function updateLastProcessedId(kv: KVNamespace, boardId: string, articleId: string): Promise<void> {
  const key = `rss-tracker:${boardId}`;
  const numericId = parseInt(articleId, 10);
  if (isNaN(numericId)) {
    console.error(`[Board ${boardId}] Attempted to update last processed ID with invalid articleId: "${articleId}"`);
    return;
  }
  await kv.put(key, numericId.toString());
}

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
  lastProcessedId: number,
  boardId: string
): { retainedItems: RSSItem[]; expiredCount: number; skippedCount: number } {
  const retainedItems: RSSItem[] = [];
  let expiredCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const itemId = parseInt(item.articleId, 10);

    // Skip if already processed (ID DESC order means smaller IDs are already done)
    if (isNaN(itemId)) {
      console.warn(`[Board ${boardId}] Item with invalid articleId found: "${item.articleId}". It will be processed.`);
    } else if (itemId <= lastProcessedId) {
      skippedCount++;
      continue;
    }

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

  return { retainedItems, expiredCount, skippedCount };
}

async function purgeExpiredArticles(
  bucket: R2Bucket,
  boardId: string,
  now: Date
): Promise<number> {
  let cursor: string | undefined;
  const prefix = `rss/${boardId}/`;
  const retentionCutoff = getCutoffDateString(now, RETENTION_YEARS);
  const allKeysToDelete: string[] = [];

  let hasMore = true;

  // Step 1: Collect all expired keys across all pages
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
        allKeysToDelete.push(object.key);
      }
    }

    const nextCursor = 'cursor' in listResult ? listResult.cursor : undefined;
    hasMore = Boolean(listResult.truncated && nextCursor);
    cursor = hasMore ? nextCursor : undefined;
  }

  // Step 2: Delete all expired keys after pagination completes (in chunks to respect R2 1000-key limit)
  let deletedCount = 0;
  if (allKeysToDelete.length > 0) {
    for (let i = 0; i < allKeysToDelete.length; i += R2_DELETE_CHUNK_SIZE) {
      const chunk = allKeysToDelete.slice(i, i + R2_DELETE_CHUNK_SIZE);
      await bucket.delete(chunk);
      deletedCount += chunk.length;

      for (const key of chunk) {
        console.log(`🗑️ [Board ${boardId}] Deleted expired article ${key}`);
      }
    }

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
      const lastProcessedId = await getLastProcessedId(env.RSS_TRACKER, boardId);
      const { retainedItems, expiredCount, skippedCount } = filterItemsByRetention(
        feed.items,
        retentionCutoff,
        lastProcessedId,
        boardId
      );

      if (skippedCount > 0) {
        console.log(`⏭️ [Board ${boardId}] Skipped ${skippedCount} items already processed`);
      }

      if (expiredCount > 0) {
        console.log(`⚠ [Board ${boardId}] Pruned ${expiredCount} items past retention window (${retentionCutoff})`);
      }

      if (retainedItems.length > 0) {
        const itemsWithPreview = await Promise.all(
          retainedItems.map(item => enrichItemWithPreview(item, previewConfig, { boardId }))
        );

        let savedCount = 0;
        let duplicateCount = 0;

        for (const item of itemsWithPreview) {
          const markdown = convertToMarkdown({ ...feed, items: [item] }, now);
          const { saved, skipped } = await saveArticlesToR2(env.RSS_STORAGE, boardId, markdown, item);

          if (saved) {
            savedCount++;
          } else if (skipped) {
            duplicateCount++;
          }
        }

        console.log(`✓ [Board ${boardId}] Saved ${savedCount} articles, ${duplicateCount} duplicates`);
        totalSaved += savedCount;

        // Update last processed ID (items are in DESC order, so first item is newest)
        await updateLastProcessedId(env.RSS_TRACKER, boardId, retainedItems[0].articleId);
      } else {
        console.log(`ℹ️ [Board ${boardId}] No new items to process`);
      }

      // Always purge expired articles, even if no new items
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

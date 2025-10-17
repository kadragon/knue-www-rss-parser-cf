import { fetchRSS } from './rss/fetcher';
import { parseRSS } from './rss/parser';
import { convertToMarkdown } from './markdown/converter';
import { writeToR2 } from './storage/r2-writer';

interface Env {
  RSS_STORAGE: R2Bucket;
  RSS_FEED_BASE_URL: string;
  BOARD_IDS: string;
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    try {
      console.log(`[${now.toISOString()}] Starting RSS archival job...`);

      const boardIds = env.BOARD_IDS.split(',').map(id => id.trim());
      console.log(`📋 Processing ${boardIds.length} boards: ${boardIds.join(', ')}`);

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

          let savedCount = 0;
          let skippedCount = 0;
          
          for (const item of feed.items) {
            const markdown = convertToMarkdown(
              { ...feed, items: [item] },
              now
            );
            
            const result = await writeToR2(
              env.RSS_STORAGE,
              markdown,
              boardId,
              item.pubDate,
              item.articleId
            );
            
            if (result.saved) {
              savedCount++;
            } else {
              skippedCount++;
            }
          }
          
          console.log(`✓ [Board ${boardId}] Saved ${savedCount} articles, skipped ${skippedCount} duplicates`);
          totalSaved += savedCount;
        } catch (error) {
          totalErrors++;
          console.error(`❌ [Board ${boardId}] Failed:`, error instanceof Error ? error.message : error);
        }
      }

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

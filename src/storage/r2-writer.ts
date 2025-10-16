import { generateR2Key } from '../utils/datetime';

export interface WriteResult {
  saved: boolean;
  reason: 'new' | 'exists';
  key: string;
}

export async function writeToR2(
  bucket: R2Bucket,
  content: string,
  boardIdx: string,
  pubDate: string,
  articleId: string
): Promise<WriteResult> {
  const key = generateR2Key(boardIdx, pubDate, articleId);

  const exists = await bucket.head(key);
  
  if (exists) {
    return {
      saved: false,
      reason: 'exists',
      key
    };
  }

  await bucket.put(key, content, {
    httpMetadata: {
      contentType: 'text/markdown; charset=utf-8'
    }
  });

  return {
    saved: true,
    reason: 'new',
    key
  };
}

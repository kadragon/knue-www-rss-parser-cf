import type { RSSItem, RSSAttachment } from './parser';
import { fetchPreviewContent } from '../preview/fetcher';

export interface PreviewConfig {
  baseUrl: string;
  token: string;
}

export interface PreviewEnv {
  PREVIEW_PARSER_BASE_URL?: string;
  PREVIEW_PARSER_TOKEN?: string;
}

interface EnrichOptions {
  boardId?: string;
  logger?: Pick<typeof console, 'error'>;
}

export async function enrichItemWithPreview(
  item: RSSItem,
  previewConfig: PreviewConfig | null,
  options: EnrichOptions = {}
): Promise<RSSItem> {
  if (!previewConfig || !item.attachments || item.attachments.length === 0) {
    return item;
  }

  const { boardId, logger = console } = options;
  const enrichedAttachments: RSSAttachment[] = [];

  for (const attachment of item.attachments) {
    if (!attachment.previewId) {
      enrichedAttachments.push(attachment);
      continue;
    }

    try {
      const previewContent = await fetchPreviewContent(attachment.previewId, previewConfig);
      enrichedAttachments.push({
        ...attachment,
        previewContent
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (boardId) {
        logger.error(
          `⚠ [Board ${boardId}] Failed to fetch preview for attachment ${attachment.previewId}: ${message}`
        );
      } else {
        logger.error(
          `⚠ Failed to fetch preview for attachment ${attachment.previewId}: ${message}`
        );
      }
      enrichedAttachments.push(attachment);
    }
  }

  return {
    ...item,
    attachments: enrichedAttachments
  };
}

export function getPreviewConfig(env: PreviewEnv): PreviewConfig | null {
  if (env.PREVIEW_PARSER_BASE_URL && env.PREVIEW_PARSER_TOKEN) {
    return {
      baseUrl: env.PREVIEW_PARSER_BASE_URL,
      token: env.PREVIEW_PARSER_TOKEN
    };
  }

  return null;
}

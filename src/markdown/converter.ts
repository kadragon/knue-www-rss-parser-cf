import type { RSSFeed } from '../rss/parser';
import { htmlToMarkdown } from './html-converter';
import { formatDateWithKST } from '../utils/datetime';

function normalizeFilename(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  const cleaned = trimmed.replace(/^[-\s\u00A0]+/, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function convertToMarkdown(feed: RSSFeed, generatedAt: Date): string {
  const lines: string[] = [];
  const previewLinks: { filename: string; url: string }[] = [];
  const downloadLinks: { filename: string; url: string }[] = [];
  const previewSeen = new Set<string>();
  const downloadSeen = new Set<string>();

  for (const item of feed.items) {
    for (const attachment of item.attachments ?? []) {
      const filename = normalizeFilename(attachment.filename, attachment.downloadUrl);

      if (attachment.previewUrl && !previewSeen.has(attachment.previewUrl)) {
        previewSeen.add(attachment.previewUrl);
        previewLinks.push({
          filename,
          url: attachment.previewUrl
        });
      }

      if (attachment.downloadUrl && !downloadSeen.has(attachment.downloadUrl)) {
        downloadSeen.add(attachment.downloadUrl);
        downloadLinks.push({
          filename,
          url: attachment.downloadUrl
        });
      }
    }
  }

  lines.push(`# ${feed.title}`);
  lines.push(`**Source**: ${feed.link}  `);
  lines.push(`**Description**: ${feed.description}  `);
  lines.push(`**Generated**: ${generatedAt.toISOString()} (${formatDateWithKST(generatedAt)})`);
  lines.push('');

  if (previewLinks.length > 0) {
    lines.push('**Preview URLs:**');
    for (const { filename, url } of previewLinks) {
      lines.push(`- ${filename}: ${url}`);
    }
    lines.push('');
  }

  if (downloadLinks.length > 0) {
    lines.push('**Download URLs:**');
    for (const { filename, url } of downloadLinks) {
      lines.push(`- ${filename}: ${url}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  for (const item of feed.items) {
    lines.push(`## [${item.title}](${item.link})`);
    lines.push(`**Published**: ${item.pubDate}  `);
    
    if (item.department && item.department.trim() !== '') {
      lines.push(`**Department**: ${item.department}`);
    }
    
    lines.push('');

    const markdownDescription = htmlToMarkdown(item.description);
    lines.push(markdownDescription);
    lines.push('');

    const previewContents = (item.attachments ?? [])
      .map(attachment => attachment.previewContent?.trim())
      .filter((content): content is string => !!content && content.length > 0);

    if (previewContents.length > 0) {
      lines.push('### 미리보기');
      lines.push('');
      for (const content of previewContents) {
        lines.push(content);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n').trim();
}

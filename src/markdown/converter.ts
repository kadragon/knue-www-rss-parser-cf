import type { RSSFeed } from '../rss/parser';
import { htmlToMarkdown } from './html-converter';
import { formatDateWithKST } from '../utils/datetime';

export function convertToMarkdown(feed: RSSFeed, generatedAt: Date): string {
  const lines: string[] = [];

  lines.push(`# ${feed.title}`);
  lines.push(`**Source**: ${feed.link}  `);
  lines.push(`**Description**: ${feed.description}  `);
  lines.push(`**Generated**: ${generatedAt.toISOString()} (${formatDateWithKST(generatedAt)})`);
  lines.push('');
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

    if (item.attachments && item.attachments.length > 0) {
      lines.push('### 첨부파일');
      for (const attachment of item.attachments) {
        lines.push(`- [${attachment.filename}](${attachment.downloadUrl})`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n').trim();
}

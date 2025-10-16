import { XMLParser } from 'fast-xml-parser';

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  department?: string;
  attachments: RSSAttachment[];
  articleId: string;
}

export interface RSSAttachment {
  filename: string;
  downloadUrl: string;
  previewUrl: string;
}

export function parseRSS(xml: string): RSSFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '_cdata',
    parseTagValue: false,
    trimValues: true
  });

  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    throw new Error(`Failed to parse RSS XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!parsed.rss || !parsed.rss.channel) {
    throw new Error('Invalid RSS format: missing rss or channel');
  }

  const channel = parsed.rss.channel;

  const title = extractCDATA(channel.title);
  const link = channel.link;
  const description = extractCDATA(channel.description);

  const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

  const items: RSSItem[] = rawItems.map((item: any) => {
    const attachments: RSSAttachment[] = [];
    
    let index = 1;
    while (item[`filename${index}`]) {
      attachments.push({
        filename: extractCDATA(item[`filename${index}`]),
        downloadUrl: extractCDATA(item[`url${index}`]),
        previewUrl: extractCDATA(item[`preview${index}`])
      });
      index++;
    }

    const link = extractCDATA(item.link);
    const articleId = extractArticleId(link);

    return {
      title: extractCDATA(item.title),
      link,
      description: extractCDATA(item.description),
      pubDate: extractCDATA(item.pubDate),
      department: extractCDATA(item.department) || '',
      attachments,
      articleId
    };
  });

  return {
    title,
    link,
    description,
    items
  };
}

function extractCDATA(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (value._cdata) return value._cdata.trim();
  return String(value).trim();
}

function extractArticleId(link: string): string {
  const match = link.match(/nttNo=(\d+)/);
  return match ? match[1] : 'unknown';
}

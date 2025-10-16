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
    trimValues: true,
    processEntities: true
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

  const items: RSSItem[] = rawItems.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    const attachments: RSSAttachment[] = [];

    let index = 1;
    while (obj[`filename${index}`]) {
      attachments.push({
        filename: extractCDATA(obj[`filename${index}`]),
        downloadUrl: extractCDATA(obj[`url${index}`]),
        previewUrl: extractCDATA(obj[`preview${index}`])
      });
      index++;
    }

    const link = extractCDATA(obj.link);
    const articleId = extractArticleId(link);

    return {
      title: extractCDATA(obj.title),
      link,
      description: extractCDATA(obj.description),
      pubDate: extractCDATA(obj.pubDate),
      department: extractCDATA(obj.department) || '',
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

function extractCDATA(value: unknown): string {
  if (!value) return '';
  let result = '';
  if (typeof value === 'string') result = value.trim();
  else if (typeof value === 'object' && value !== null && '_cdata' in value) {
    const obj = value as Record<string, unknown>;
    if (typeof obj._cdata === 'string') {
      result = obj._cdata.trim();
    }
  } else {
    result = String(value).trim();
  }
  return decodeHTMLEntities(result);
}

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'"
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char);
  }
  return result;
}

function extractArticleId(link: string): string {
  const match = link.match(/nttNo=(\d+)/);
  return match ? match[1] : 'unknown';
}

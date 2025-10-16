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

const HTML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'"
};

const ENTITY_REGEX = new RegExp(Object.keys(HTML_ENTITIES).join('|'), 'g');

function extractCDATA(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return decodeHTMLEntities(value.trim());
  }

  if (typeof value === 'object' && value !== null && '_cdata' in value && typeof (value as Record<string, unknown>)._cdata === 'string') {
    return decodeHTMLEntities(((value as Record<string, unknown>)._cdata as string).trim());
  }

  return decodeHTMLEntities(String(value).trim());
}

function decodeHTMLEntities(text: string): string {
  return text.replace(ENTITY_REGEX, (match) => HTML_ENTITIES[match] || match);
}

function extractArticleId(link: string): string {
  const match = link.match(/nttNo=(\d+)/);
  return match ? match[1] : 'unknown';
}

import { writeFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { convert as htmlToText } from 'html-to-text';

const RSS_URL = process.env.RSS_URL || 'https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=27';
const PREVIEW_BASE_URL =
  process.env.PREVIEW_BASE_URL || 'https://knue-www-preview-parser-cf.kangdongouk.workers.dev/';
const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;

if (!PREVIEW_TOKEN) {
  console.error('PREVIEW_TOKEN environment variable is required.');
  process.exit(1);
}

async function main() {
  const xml = await fetchText(RSS_URL);
  const feed = parseRSS(xml);

  if (!feed.items.length) {
    throw new Error('No RSS items found.');
  }

  const firstItem = feed.items[0];
  const enrichedItem = await enrichItemWithPreview(firstItem);
  const now = new Date();
  const markdown = convertToMarkdown({ ...feed, items: [enrichedItem] }, now);

  const filename = `${enrichedItem.articleId}.txt`;
  writeFileSync(filename, markdown, 'utf-8');

  console.log(`Saved markdown for article ${enrichedItem.articleId} to ${filename}`);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

function parseRSS(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '_cdata',
    parseTagValue: false,
    trimValues: true,
    processEntities: true
  });

  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;

  if (!channel) {
    throw new Error('Invalid RSS structure: missing channel');
  }

  const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

  const items = rawItems.map(rawEntry => {
    const raw = rawEntry;
    const attachments = [];
    let index = 1;

    while (raw[`filename${index}`]) {
      const previewUrl = extractCDATA(raw[`preview${index}`]);
      attachments.push({
        filename: extractCDATA(raw[`filename${index}`]),
        downloadUrl: extractCDATA(raw[`url${index}`]),
        previewUrl,
        previewId: extractAtchmnflNo(previewUrl)
      });
      index += 1;
    }

    const link = extractCDATA(raw.link);

    return {
      title: extractCDATA(raw.title),
      link,
      description: extractCDATA(raw.description),
      pubDate: extractCDATA(raw.pubDate),
      department: extractCDATA(raw.department) || '',
      attachments,
      articleId: extractArticleId(link)
    };
  });

  return {
    title: extractCDATA(channel.title),
    link: channel.link,
    description: extractCDATA(channel.description),
    items
  };
}

function extractCDATA(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return decodeHTMLEntities(value.trim());
  }

  if (typeof value === 'object' && value !== null) {
    const record = value;
    if (Object.prototype.hasOwnProperty.call(record, '_cdata')) {
      const cdataValue = record._cdata;
      if (typeof cdataValue === 'string') {
        return decodeHTMLEntities(cdataValue.trim());
      }
    }
  }

  return decodeHTMLEntities(String(value).trim());
}

const HTML_ENTITIES = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'"
};

const ENTITY_REGEX = new RegExp(Object.keys(HTML_ENTITIES).join('|'), 'g');

function decodeHTMLEntities(text) {
  return text.replace(ENTITY_REGEX, match => HTML_ENTITIES[match] || match);
}

function extractArticleId(link) {
  const match = link.match(/nttNo=(\d+)/);
  return match ? match[1] : 'unknown';
}

function extractAtchmnflNo(previewUrl) {
  if (!previewUrl) return undefined;
  const match = previewUrl.match(/atchmnflNo=(\d+)/);
  return match ? match[1] : undefined;
}

async function enrichItemWithPreview(item) {
  const enriched = await Promise.all(
    (item.attachments || []).map(async attachment => {
      if (!attachment.previewId) {
        return attachment;
      }

      try {
        const previewContent = await fetchPreviewContent(attachment.previewId);
        return { ...attachment, previewContent };
      } catch (error) {
        console.error(
          `Failed to fetch preview for attachment ${attachment.previewId}:`,
          error instanceof Error ? error.message : error
        );
        return attachment;
      }
    })
  );

  return { ...item, attachments: enriched };
}

async function fetchPreviewContent(atchmnflNo) {
  const url = new URL(PREVIEW_BASE_URL);
  url.searchParams.set('atchmnflNo', atchmnflNo);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${PREVIEW_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Preview fetch failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload?.success || typeof payload.content !== 'string') {
    const reason = payload?.error || 'Unknown reason';
    throw new Error(`Preview API returned success=false: ${reason}`);
  }

  return String(payload.content).trim();
}

function normalizeFilename(name, fallback) {
  if (!name) return fallback;
  const trimmed = String(name).trim();
  const cleaned = trimmed.replace(/^[-\s\u00A0]+/, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function convertToMarkdown(feed, generatedAt) {
  const previewLinks = [];
  const downloadLinks = [];
  const previewSeen = new Set();
  const downloadSeen = new Set();

  for (const item of feed.items) {
    for (const attachment of item.attachments ?? []) {
      const filename = normalizeFilename(attachment.filename, attachment.downloadUrl);

      if (attachment.previewUrl && !previewSeen.has(attachment.previewUrl)) {
        previewSeen.add(attachment.previewUrl);
        previewLinks.push({ filename, url: attachment.previewUrl });
      }

      if (attachment.downloadUrl && !downloadSeen.has(attachment.downloadUrl)) {
        downloadSeen.add(attachment.downloadUrl);
        downloadLinks.push({ filename, url: attachment.downloadUrl });
      }
    }
  }

  const lines = [];

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
      .map(att => att.previewContent?.trim())
      .filter(Boolean);

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

function htmlToMarkdown(html) {
  if (!html || html.trim() === '') {
    return '';
  }

  return htmlToText(html, { wordwrap: 80 }).trim();
}

function formatDateWithKST(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const values = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  const { year, month, day, hour, minute, second } = values;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

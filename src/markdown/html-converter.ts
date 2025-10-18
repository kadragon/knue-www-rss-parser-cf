import htmlToMd from 'html-to-md';

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  return htmlToMd(html).trim();
}

import { convert } from 'html-to-text';

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  return convert(html, {
    wordwrap: 80
  }).trim();
}

import TurndownService from 'turndown';
import { parseHTML } from 'linkedom';

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  const { document } = parseHTML('<!DOCTYPE html><html><body></body></html>');
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**'
  });

  (globalThis as unknown as { document: typeof document }).document = document;

  try {
    return turndownService.turndown(html).trim();
  } finally {
    delete (globalThis as unknown as { document?: typeof document }).document;
  }
}

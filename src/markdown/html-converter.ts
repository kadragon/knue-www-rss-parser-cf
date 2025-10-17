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

  const globalWithDocument = globalThis as { document?: typeof document };
  const originalDocument = globalWithDocument.document;
  globalWithDocument.document = document;

  try {
    return turndownService.turndown(html).trim();
  } finally {
    if (originalDocument !== undefined) {
      globalWithDocument.document = originalDocument;
    } else {
      delete globalWithDocument.document;
    }
  }
}

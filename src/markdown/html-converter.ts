import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**'
});

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  return turndownService.turndown(html).trim();
}

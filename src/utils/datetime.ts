export function formatDateISO(date: Date): string {
  return date.toISOString();
}

export function generateR2Key(boardIdx: string, pubDate: string, articleId: string): string {
  const dateOnly = pubDate.split(' ')[0];
  const dateParts = dateOnly.split('-');
  
  if (dateParts.length !== 3) {
    throw new Error(`Invalid date format: ${pubDate}`);
  }
  
  const [year, month, day] = dateParts;
  
  return `rss/${boardIdx}/${year}_${month}_${day}_${articleId}.md`;
}

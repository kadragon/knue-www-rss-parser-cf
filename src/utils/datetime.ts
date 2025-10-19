export function formatDateISO(date: Date): string {
  return date.toISOString();
}

export function formatDateWithKST(date: Date): string {
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
  const values: Record<string, string> = {};

  parts.forEach(({ type, value }) => {
    values[type] = value;
  });

  const { year, month, day, hour, minute, second } = values;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

export function generateR2Key(boardIdx: string, pubDate: string, articleId: string): string {
  const dateOnly = extractDateOnly(pubDate);
  const dateParts = dateOnly.split('-');
  
  if (dateParts.length !== 3) {
    throw new Error(`Invalid date format: ${pubDate}`);
  }
  
  const [year, month, day] = dateParts;
  
  return `rss/${boardIdx}/${year}_${month}_${day}_${articleId}.md`;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function extractDateOnly(value: string): string {
  if (!value) {
    throw new Error(`Invalid date format: ${value}`);
  }

  const trimmed = value.trim();
  const datePart = trimmed.split(' ')[0];

  if (!DATE_ONLY_REGEX.test(datePart)) {
    throw new Error(`Invalid date format: ${value}`);
  }

  return datePart;
}

export function getCutoffDateString(baseline: Date, years: number): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const [yearStr, monthStr, dayStr] = formatter.format(baseline).split('-');
  const month = Number(monthStr);
  const originalDay = Number(dayStr);
  const targetYear = Number(yearStr) - years;
  const daysInTargetMonth = getDaysInMonth(targetYear, month);
  const targetDay = Math.min(originalDay, daysInTargetMonth);

  return `${targetYear}-${monthStr}-${String(targetDay).padStart(2, '0')}`;
}

export function parseDateFromR2Key(key: string): string | null {
  const match = key.match(/^rss\/[^/]+\/(\d{4})_(\d{2})_(\d{2})_/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

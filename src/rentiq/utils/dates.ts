const DAY_MS = 24 * 60 * 60 * 1000;

function parseISODateParts(value: string): { year: number; month: number; day: number } {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Date invalide: ${value}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(value: string): Date {
  const { year, month, day } = parseISODateParts(value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(value: string | Date, days: number): string {
  const date = value instanceof Date ? fromISODate(toISODate(value)) : fromISODate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function diffInDays(from: string | Date, to: string | Date): number {
  const start = from instanceof Date ? fromISODate(toISODate(from)) : fromISODate(from);
  const end = to instanceof Date ? fromISODate(toISODate(to)) : fromISODate(to);
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

export function eachDay(start: string, length: number): string[] {
  const result: string[] = [];
  for (let index = 0; index < length; index += 1) {
    result.push(addDays(start, index));
  }
  return result;
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function isWeekend(date: string): boolean {
  const day = fromISODate(date).getUTCDay();
  return day === 0 || day === 5 || day === 6;
}

export function dayLabel(date: string): string {
  return fromISODate(date).toLocaleDateString('fr-MA', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/**
 * Analytics helper utilities – date ranges, bucketing, and simple statistics.
 */

export function daysAgoDate(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function isoDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

/** Returns the ISO date string used as the bucket key for a given timestamp. */
export function dayBucket(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

/** Fills in missing date buckets between startDate and today with a default value. */
export function fillDateGaps(
  series: Array<{ date: string; [key: string]: unknown }>,
  days: number,
  defaultValue: Record<string, number>
): Array<{ date: string; [key: string]: unknown }> {
  const existing = new Map(series.map(e => [e.date, e]));
  const result: Array<{ date: string; [key: string]: unknown }> = [];
  const start = daysAgoDate(days);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = isoDate(d);
    result.push(existing.get(key) ?? { date: key, ...defaultValue });
  }
  return result;
}

/** Safe average – returns 0 when the array is empty. */
export function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

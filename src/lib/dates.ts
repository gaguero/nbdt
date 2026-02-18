/**
 * Returns today's date as YYYY-MM-DD using the browser's LOCAL timezone.
 * Use this instead of new Date().toISOString().split('T')[0] which returns UTC.
 */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Returns a date offset by `days` from the given date (default today), local timezone.
 */
export function localDateOffset(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

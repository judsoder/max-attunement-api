const TIMEZONE = "America/Denver";

/**
 * Get current time in Denver timezone
 */
export function nowDenver(): Date {
  return new Date();
}

/**
 * Get the start of today in Denver timezone
 */
export function todayDenver(): Date {
  const now = new Date();
  const denverStr = now.toLocaleDateString("en-US", { timeZone: TIMEZONE });
  const [month, day, year] = denverStr.split("/").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Get a date N days from now in Denver timezone
 */
export function daysFromNow(days: number): Date {
  const now = nowDenver();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return future;
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = nowDenver();
  const future = daysFromNow(days);

  return date >= now && date <= future;
}

/**
 * Format a date to locale string in Denver timezone
 */
export function formatDateDenver(dateStr: string | null): string {
  if (!dateStr) return "TBD";

  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get ISO string with Denver timezone offset
 */
export function toISODenver(date: Date = new Date()): string {
  return date.toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace(" ", "T") + "-07:00";
}

/**
 * Get start and end of the next N days window for calendar queries
 */
export function getDateRange(days: number): { start: Date; end: Date } {
  const start = nowDenver();
  const end = daysFromNow(days);
  return { start, end };
}

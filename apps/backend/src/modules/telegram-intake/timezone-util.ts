const TASHKENT_OFFSET_SECONDS = 5 * 3600; // +05:00 (18,000s)

/**
 * Deterministically derives the Uzbekistan calendar day (YYYY-MM-DD) in Asia/Tashkent
 * from a Unix timestamp in seconds.
 *
 * Uses pure UTC+5 arithmetic to prevent timezone drift, DST variations, or OS locale dependencies.
 */
export function getTashkentCalendarDay(unixSeconds: number): string {
  const safeSeconds =
    typeof unixSeconds === 'number' && Number.isFinite(unixSeconds) && unixSeconds > 0
      ? (unixSeconds > 1e11 ? Math.floor(unixSeconds / 1000) : Math.floor(unixSeconds))
      : Math.floor(Date.now() / 1000);
  const adjustedDate = new Date((safeSeconds + TASHKENT_OFFSET_SECONDS) * 1000);
  const year = adjustedDate.getUTCFullYear();
  const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

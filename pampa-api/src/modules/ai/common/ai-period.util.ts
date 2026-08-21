/** Calendar-month billing period, UTC. No leap/DST edge cases to worry about — setUTCMonth normalizes overflow (e.g. Jan 31 + 1 month -> Mar 3, acceptable for v1 with no real billing yet). */
export function addOneMonthUtc(date: Date): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

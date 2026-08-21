import { InvalidPeriodError, resolvePeriod } from './period.util';

describe('resolvePeriod', () => {
  it('resolves "today" to [start of today, now)', () => {
    const { from, to } = resolvePeriod('today');
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(to.getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it('resolves "yesterday" to a full day before today', () => {
    const { from, to } = resolvePeriod('yesterday');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(to.getTime()).toBe(today.getTime());
    expect(today.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('rejects "custom" without customFrom/customTo', () => {
    expect(() => resolvePeriod('custom')).toThrow(InvalidPeriodError);
  });

  it('rejects "custom" with customFrom after customTo', () => {
    expect(() => resolvePeriod('custom', '2026-02-01', '2026-01-01')).toThrow(
      InvalidPeriodError,
    );
  });

  it('rejects "custom" with a range wider than the maximum allowed', () => {
    expect(() => resolvePeriod('custom', '2020-01-01', '2026-01-01')).toThrow(
      InvalidPeriodError,
    );
  });

  it('accepts a valid "custom" range', () => {
    const { from, to, label } = resolvePeriod(
      'custom',
      '2026-01-01',
      '2026-01-31',
    );
    expect(from.getFullYear()).toBe(2026);
    expect(to.getMonth()).toBe(0);
    expect(label).toContain('2026-01-01');
  });
});

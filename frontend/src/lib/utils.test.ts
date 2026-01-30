import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatNumber, formatHashrate, formatPower, formatBTC } from './utils';

describe('cn (className merger)', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toBe('base included');
  });

  it('resolves tailwind conflicts correctly', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });
});

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('formats large numbers correctly', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000');
  });

  it('formats decimal numbers with precision', () => {
    expect(formatCurrency(99.99)).toBe('$99.99');
  });
});

describe('formatNumber', () => {
  it('formats numbers with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles decimal numbers', () => {
    const result = formatNumber(1234.567);
    expect(result).toMatch(/1,234/);
  });
});

describe('formatHashrate', () => {
  it('formats TH/s correctly', () => {
    expect(formatHashrate(100)).toBe('100.00 TH/s');
  });

  it('formats PH/s for large values', () => {
    expect(formatHashrate(1500)).toBe('1.50 PH/s');
  });

  it('formats small TH/s correctly', () => {
    expect(formatHashrate(0.5)).toBe('0.50 TH/s');
  });
});

describe('formatPower', () => {
  it('formats watts correctly', () => {
    expect(formatPower(500)).toBe('500 W');
  });

  it('formats kilowatts correctly', () => {
    expect(formatPower(3500)).toBe('3.50 kW');
  });

  it('formats megawatts correctly', () => {
    expect(formatPower(1500000)).toBe('1.50 MW');
  });
});

describe('formatBTC', () => {
  it('formats BTC with 8 decimal places', () => {
    expect(formatBTC(0.00123456)).toBe('0.00123456 BTC');
  });

  it('formats whole BTC correctly', () => {
    expect(formatBTC(1)).toBe('1.00000000 BTC');
  });

  it('formats small amounts as satoshis', () => {
    // 0.00000001 BTC = 1 satoshi, which is < 0.00001 BTC
    expect(formatBTC(0.00000001)).toBe('1 sats');
  });

  it('formats amounts above satoshi threshold as BTC', () => {
    expect(formatBTC(0.0001)).toBe('0.00010000 BTC');
  });
});

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatHashrate(thps: number): string {
  if (thps >= 1000) {
    return `${(thps / 1000).toFixed(2)} PH/s`;
  }
  return `${thps.toFixed(2)} TH/s`;
}

export function formatPower(watts: number): string {
  if (watts >= 1000000) {
    return `${(watts / 1000000).toFixed(2)} MW`;
  }
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${watts} W`;
}

export function formatBTC(btc: number): string {
  if (btc < 0.00001) {
    return `${(btc * 100000000).toFixed(0)} sats`;
  }
  return `${btc.toFixed(8)} BTC`;
}

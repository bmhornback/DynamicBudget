/**
 * Formatting utilities for MoveMath.
 */

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const USD_FORMATTER_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as USD currency (no cents).
 * e.g. 3000 → "$3,000"
 */
export function formatCurrency(value: number): string {
  return USD_FORMATTER.format(value);
}

/**
 * Format a number as USD currency with cents.
 * e.g. 3000.50 → "$3,000.50"
 */
export function formatCurrencyWithCents(value: number): string {
  return USD_FORMATTER_CENTS.format(value);
}

/**
 * Format a decimal as a percentage string.
 * e.g. 0.153 → "15.3%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as a percentage (0–100 scale).
 * e.g. 15.3 → "15.3%"
 */
export function formatPercentRaw(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a monthly value and show annual equivalent.
 * e.g. 500 → "$500/mo ($6,000/yr)"
 */
export function formatMonthlyAndAnnual(monthly: number): string {
  return `${formatCurrency(monthly)}/mo (${formatCurrency(monthly * 12)}/yr)`;
}

/**
 * Parse a string to a number, returning 0 if invalid.
 */
export function parseInputValue(value: string): number {
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

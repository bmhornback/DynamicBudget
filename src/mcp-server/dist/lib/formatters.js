"use strict";
/**
 * Formatting utilities for DynamicBudget.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatCurrencyWithCents = formatCurrencyWithCents;
exports.formatPercent = formatPercent;
exports.formatPercentRaw = formatPercentRaw;
exports.formatMonthlyAndAnnual = formatMonthlyAndAnnual;
exports.parseInputValue = parseInputValue;
exports.clamp = clamp;
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
function formatCurrency(value) {
    return USD_FORMATTER.format(value);
}
/**
 * Format a number as USD currency with cents.
 * e.g. 3000.50 → "$3,000.50"
 */
function formatCurrencyWithCents(value) {
    return USD_FORMATTER_CENTS.format(value);
}
/**
 * Format a decimal as a percentage string.
 * e.g. 0.153 → "15.3%"
 */
function formatPercent(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}
/**
 * Format a number as a percentage (0–100 scale).
 * e.g. 15.3 → "15.3%"
 */
function formatPercentRaw(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
/**
 * Format a monthly value and show annual equivalent.
 * e.g. 500 → "$500/mo ($6,000/yr)"
 */
function formatMonthlyAndAnnual(monthly) {
    return `${formatCurrency(monthly)}/mo (${formatCurrency(monthly * 12)}/yr)`;
}
/**
 * Parse a string to a number, returning 0 if invalid.
 */
function parseInputValue(value) {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}
/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

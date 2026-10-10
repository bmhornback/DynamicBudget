/**
 * Receipt OCR extraction helpers for DynamicBudget.
 *
 * These utilities intentionally stay pure and deterministic so they remain easy
 * to test and safe to use in static export/browser-only contexts.
 */

import type {
  ReceiptCategory,
  ReceiptExtractionResult,
  ReceiptFieldCandidate,
  ReceiptReviewEdits,
  ReceiptReviewField,
  ReceiptReviewState,
} from '@/types/budget';

const RECEIPT_CATEGORY_KEYWORDS: Array<{ category: ReceiptCategory; keywords: string[] }> = [
  { category: 'groceries', keywords: ['whole foods', 'trader joe', 'albertsons', 'safeway', 'kroger', 'market', 'grocery', 'food lion', 'walmart', 'costco', 'target'] },
  { category: 'food', keywords: ['starbucks', 'coffee', 'cafe', 'restaurant', 'pizza', 'burger', 'mcdonald', 'subway', 'dunkin', 'bistro', 'catering'] },
  { category: 'transportation', keywords: ['shell', 'chevron', 'exxon', 'uber', 'lyft', 'metro', 'airline', 'airport', 'parking', 'gas station', 'diesel', 'rail', 'transit'] },
  { category: 'health', keywords: ['pharmacy', 'cvs', 'walgreens', 'clinic', 'dental', 'optical', 'hospital', 'medication', 'veterinary', 'vet'] },
  { category: 'utilities', keywords: ['verizon', 'at&t', 'xfinity', 'comcast', 'water', 'electric', 'power', 'utility', 'internet', 'phone', 'cellular'] },
  { category: 'pets', keywords: ['petco', 'petsmart', 'pet supplies', 'dog', 'cat', 'grooming', 'vet'] },
  { category: 'travel', keywords: ['hotel', 'marriott', 'airbnb', 'travel', 'resort', 'vacation', 'airline', 'lodging'] },
  { category: 'subscriptions', keywords: ['spotify', 'netflix', 'hulu', 'youtube', 'prime', 'subscription', 'streaming'] },
  { category: 'home', keywords: ['home depot', 'lowe\'s', 'hardware', 'furniture', 'home improvement', 'apartment', 'rent', 'landlord'] },
];

const DEFAULT_CATEGORY: ReceiptCategory = 'other';
const MAX_MERCHANT_CONFIDENCE = 0.92;
const BASE_MERCHANT_CONFIDENCE = 0.46;
const MERCHANT_LENGTH_DIVISOR = 80;
const DUPLICATE_RISK_STRENGTH = 0.8;
const DUPLICATE_RISK_WEAK = 0.35;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toCurrencyNumber(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, '').replace(/[\u00a0]/g, '');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function containsReceiptNoise(line: string): boolean {
  const normalized = line.toLowerCase();
  return [
    'thank you',
    'welcome',
    'cashier',
    'receipt',
    'order',
    'signature',
    'terminal',
    'server',
    'change',
    'balance',
    'status',
    'thank-you',
    'customer copy',
  ].some((token) => normalized.includes(token));
}

function isLikelyStoreLine(line: string): boolean {
  const normalized = normalizeWhitespace(line);
  if (!normalized || normalized.length < 2) return false;
  if (containsReceiptNoise(normalized)) return false;
  if (/^\d+$/.test(normalized)) return false;
  if (/^(subtotal|tax|total|amount|change|payment|visa|mastercard|amex|discover|cash|credit|debit)/i.test(normalized)) {
    return false;
  }
  return /[A-Za-z]/.test(normalized);
}

function parseDateCandidate(value: string, now = new Date()): string | null {
  const match = value.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|[A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i);
  if (!match) return null;

  const candidate = match[1].trim();
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }

  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(candidate)) {
    const [left, mid, yearPart] = candidate.split(/[\/\-]/);
    const month = Number(left);
    const day = Number(mid);
    // Default two-digit years to the 2000s and only fall back to 1900s when the
    // interpreted year is clearly in the distant future relative to the current date.
    const rawYear = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
    const year = yearPart.length === 2 && rawYear > now.getFullYear() + 5 ? Number(`19${yearPart}`) : rawYear;
    if (Number.isFinite(month) && Number.isFinite(day) && Number.isFinite(year)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthMatch = candidate.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
  if (monthMatch) {
    const monthName = monthMatch[1].slice(0, 3).toLowerCase();
    const monthIndex = monthNames.indexOf(monthName);
    const day = Number(monthMatch[2]);
    const year = Number(monthMatch[3] ?? now.getFullYear());
    if (monthIndex >= 0 && Number.isFinite(day) && Number.isFinite(year)) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

function buildFieldCandidate<T>(value: T, confidence: number, source: string): ReceiptFieldCandidate<T> {
  return { value, confidence, source };
}

export function getReceiptCategoryHint(merchant: string): ReceiptCategory {
  const normalized = normalizeWhitespace(merchant).toLowerCase();
  if (!normalized) return DEFAULT_CATEGORY;

  for (const rule of RECEIPT_CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }

  return DEFAULT_CATEGORY;
}

export function normalizeReceiptText(rawText: string): string {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseReceiptText(rawText: string, options?: { now?: Date; merchantHint?: string }): ReceiptExtractionResult {
  const normalizedText = normalizeReceiptText(rawText ?? '');
  const lines = normalizedText ? normalizedText.split('\n') : [];

  const now = options?.now ?? new Date();
  let merchantValue = options?.merchantHint && options.merchantHint.trim() ? options.merchantHint.trim() : '';
  let merchantSource = 'merchant_hint';
  let merchantScore = merchantValue ? 0.5 : 0;

  for (const line of lines) {
    if (!isLikelyStoreLine(line)) continue;
    const score = line.length >= 3
      ? Math.min(MAX_MERCHANT_CONFIDENCE, BASE_MERCHANT_CONFIDENCE + line.length / MERCHANT_LENGTH_DIVISOR)
      : BASE_MERCHANT_CONFIDENCE;
    if (score > merchantScore) {
      merchantValue = line;
      merchantScore = score;
      merchantSource = 'ocr_line';
    }
  }

  const dateCandidates = lines
    .map((line) => {
      const date = parseDateCandidate(line, now);
      if (!date) return null;
      const hasExplicitYear = /\d{4}/.test(line);
      const score = hasExplicitYear ? 0.9 : 0.72;
      return { source: line, date, score };
    })
    .filter((entry): entry is { source: string; date: string; score: number } => Boolean(entry));

  const dateValue = dateCandidates.length > 0
    ? [...dateCandidates].sort((left, right) => right.score - left.score)[0].date
    : null;

  const totalCandidates: Array<{ value: number; source: string; score: number }> = [];
  for (const line of lines) {
    const keywordMatch = line.match(/(?:^|[^A-Za-z])(?:total|amount due|balance|payment|grand total|order total)(?:\s*[:=]|\s+)\s*[$]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{1,2})/i);
    const amountMatches = [...line.matchAll(/[$]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{1,2})/g)];
    const candidateValue = keywordMatch ? keywordMatch[1] : amountMatches
      .map((match) => match[1])
      .filter((match): match is string => Boolean(match))
      .sort((left, right) => Number(toCurrencyNumber(right) ?? 0) - Number(toCurrencyNumber(left) ?? 0))[0] ?? null;
    if (!candidateValue) continue;
    const numeric = toCurrencyNumber(candidateValue);
    if (numeric === null) continue;
    const isTargeted = Boolean(keywordMatch);
    totalCandidates.push({ value: numeric, source: line, score: isTargeted ? 0.93 : 0.7 });
  }

  const rankedTotalCandidates = [...totalCandidates].sort((left, right) => right.score - left.score);
  const finalTotalCandidate = rankedTotalCandidates.find((candidate) => !/^(?:.*\s)?subtotal\s*[:=]?\s*[$]?[0-9]/i.test(candidate.source)) ?? rankedTotalCandidates[0] ?? null;
  const totalValue = finalTotalCandidate?.value ?? null;
  const totalConfidence = finalTotalCandidate?.score ?? 0.4;

  const taxCandidates: Array<{ value: number; source: string; score: number }> = [];
  for (const line of lines) {
    const taxMatch = line.match(/(?:tax|sales tax|vat|gst|hst)\s*[:=]?\s*[$]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{1,2})/i);
    if (!taxMatch) continue;
    const numeric = toCurrencyNumber(taxMatch[1]);
    if (numeric === null) continue;
    taxCandidates.push({ value: numeric, source: line, score: 0.9 });
  }

  const taxValue = taxCandidates.length > 0
    ? [...taxCandidates].sort((left, right) => right.score - left.score)[0].value
    : null;

  const category = getReceiptCategoryHint(merchantValue || '');

  const merchantCandidate = buildFieldCandidate(
    merchantValue || 'Unknown merchant',
    merchantValue ? Math.min(0.97, merchantScore) : 0.35,
    merchantSource
  );
  const dateCandidate = dateValue
    ? buildFieldCandidate(dateValue, dateCandidates.length > 0 ? Math.max(...dateCandidates.map((candidate) => candidate.score)) : 0.45, 'ocr_date')
    : null;
  const totalCandidate = totalValue !== null ? buildFieldCandidate(totalValue, totalConfidence, 'ocr_total') : null;
  const taxCandidate = taxValue !== null ? buildFieldCandidate(taxValue, 0.9, 'ocr_tax') : null;

  const duplicateRisk = {
    merchant: Boolean(merchantValue) && merchantCandidate.confidence >= 0.5,
    date: dateCandidate !== null && dateCandidate.confidence >= 0.5,
    amount: totalCandidate !== null && totalCandidate.confidence >= 0.5,
    score: totalCandidate && dateCandidate ? DUPLICATE_RISK_STRENGTH : DUPLICATE_RISK_WEAK,
  };

  const needsReview = !merchantValue || !dateCandidate || !totalCandidate || totalCandidate.confidence < 0.75 || merchantCandidate.confidence < 0.5;

  return {
    merchant: merchantCandidate,
    date: dateCandidate,
    total: totalCandidate,
    tax: taxCandidate,
    category: buildFieldCandidate(category, merchantCandidate.confidence > 0.7 ? 0.8 : 0.55, 'category_hint'),
    duplicateRisk,
    needsReview,
    rawText: rawText ?? '',
    normalizedText,
    source: 'ocr',
  };
}

export function createReceiptReviewState(
  extraction: ReceiptExtractionResult,
  edits: ReceiptReviewEdits = {},
  options?: { confirmed?: boolean; reviewedAt?: Date | null }
): ReceiptReviewState {
  const normalizedEdits = Object.entries(edits).filter(([, value]) => value !== undefined) as Array<[
    ReceiptReviewField,
    string | number | null
  ]>;

  const reviewedFields = normalizedEdits.map(([field]) => field);
  const merchantValue = (edits.merchant ?? extraction.merchant.value).toString().trim() || 'Unknown merchant';
  const dateValue = edits.date ?? extraction.date?.value ?? null;
  const totalValue = edits.total ?? extraction.total?.value ?? null;
  const taxValue = edits.tax ?? extraction.tax?.value ?? null;
  const categoryValue = (edits.category ?? extraction.category.value) as ReceiptCategory;

  const finalMerchant = buildFieldCandidate(merchantValue, extraction.merchant.confidence, 'manual_review');
  const finalDate = dateValue ? buildFieldCandidate(dateValue, extraction.date?.confidence ?? 0.8, 'manual_review') : null;
  const finalTotal = totalValue !== null ? buildFieldCandidate(totalValue, extraction.total?.confidence ?? 0.8, 'manual_review') : null;
  const finalTax = taxValue !== null ? buildFieldCandidate(taxValue, extraction.tax?.confidence ?? 0.8, 'manual_review') : null;
  const finalCategory = buildFieldCandidate(categoryValue, extraction.category.confidence, 'manual_review');

  const explicitConfirmation = options?.confirmed ?? false;
  const reviewState: ReceiptReviewState = {
    merchant: finalMerchant,
    date: finalDate,
    total: finalTotal,
    tax: finalTax,
    category: finalCategory,
    duplicateRisk: extraction.duplicateRisk,
    needsReview: explicitConfirmation ? false : finalMerchant.value === 'Unknown merchant' || !finalDate || !finalTotal,
    rawText: extraction.rawText,
    normalizedText: extraction.normalizedText,
    source: 'ocr',
    confirmed: explicitConfirmation,
    reviewedAt: options?.reviewedAt ? options.reviewedAt.toISOString() : null,
    changedFields: [...new Set(reviewedFields)],
  };

  return reviewState;
}

export function confirmReceiptReview(
  reviewState: ReceiptReviewState,
  overrides: ReceiptReviewEdits = {}
): ReceiptReviewState {
  return createReceiptReviewState({
    merchant: reviewState.merchant,
    date: reviewState.date,
    total: reviewState.total,
    tax: reviewState.tax,
    category: reviewState.category,
    duplicateRisk: reviewState.duplicateRisk,
    needsReview: reviewState.needsReview,
    rawText: reviewState.rawText,
    normalizedText: reviewState.normalizedText,
    source: 'ocr',
  }, overrides, { confirmed: true, reviewedAt: new Date() });
}

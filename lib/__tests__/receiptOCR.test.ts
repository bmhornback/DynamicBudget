import {
  confirmReceiptReview,
  createReceiptReviewState,
  getReceiptCategoryHint,
  normalizeReceiptText,
  parseReceiptText,
} from '../receiptOCR';

describe('receiptOCR', () => {
  it('extracts merchant, date, total, tax, and category hints from OCR text', () => {
    const receiptText = [
      'WHOLE FOODS MARKET',
      'Sep 23, 2026',
      'SUBTOTAL 42.50',
      'TAX 3.34',
      'TOTAL 45.84',
    ].join('\n');

    const result = parseReceiptText(receiptText);

    expect(result.merchant.value).toBe('WHOLE FOODS MARKET');
    expect(result.date?.value).toBe('2026-09-23');
    expect(result.total?.value).toBe(45.84);
    expect(result.tax?.value).toBe(3.34);
    expect(result.category.value).toBe('groceries');
    expect(result.needsReview).toBe(false);
  });

  it('flags low-confidence OCR fields for manual review', () => {
    const result = parseReceiptText('Unknown merchant\nTotal 12.99');

    expect(result.merchant.value).toBe('Unknown merchant');
    expect(result.total?.value).toBe(12.99);
    expect(result.needsReview).toBe(true);
    expect(result.category.value).toBe('other');
  });

  it('normalizes and parses multiple date formats', () => {
    expect(normalizeReceiptText('  Sep\n  23, 2026  ')).toBe('Sep\n23, 2026');
    expect(parseReceiptText('11/12/2025').date?.value).toBe('2025-11-12');
    expect(parseReceiptText('09-24-26').date?.value).toBe('2026-09-24');
    expect(parseReceiptText('Oct 4 2026').date?.value).toBe('2026-10-04');
    expect(parseReceiptText('Oct 4', { now: new Date('2026-03-15') }).date?.value).toBe('2026-10-04');
  });

  it('classifies merchant strings consistently', () => {
    expect(getReceiptCategoryHint('Starbucks')).toBe('food');
    expect(getReceiptCategoryHint('CVS Pharmacy')).toBe('health');
    expect(getReceiptCategoryHint('Xfinity')).toBe('utilities');
    expect(getReceiptCategoryHint('Petco')).toBe('pets');
  });

  it('supports editable review state with explicit confirmation gating', () => {
    const extraction = parseReceiptText([
      'GROCERY STORE',
      'Sep 23, 2026',
      'TOTAL 45.84',
    ].join('\n'));

    const review = createReceiptReviewState(extraction, {
      merchant: 'Whole Foods Market',
      total: 48.50,
      category: 'groceries',
    }, { confirmed: false, reviewedAt: new Date('2026-09-23T12:00:00Z') });

    expect(review.merchant.value).toBe('Whole Foods Market');
    expect(review.total?.value).toBe(48.5);
    expect(review.category.value).toBe('groceries');
    expect(review.changedFields).toContain('merchant');
    expect(review.changedFields).toContain('total');
    expect(review.confirmed).toBe(false);
    expect(review.needsReview).toBe(false);

    const confirmed = confirmReceiptReview(review, {
      total: 48.50,
      date: '2026-09-23',
    });

    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.needsReview).toBe(false);
    expect(confirmed.reviewedAt).not.toBeNull();
  });
});

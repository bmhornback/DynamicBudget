import {
  confirmReceiptReview,
  createReceiptReviewState,
  createReceiptSpendEntry,
  evaluateReceiptDuplicateRisk,
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
    expect(confirmed.changedFields).toContain('merchant');
    expect(confirmed.changedFields).toContain('total');
  });

  it('treats explicit null edits as deliberate clears without reverting to the original value', () => {
    const extraction = parseReceiptText([
      'WHOLE FOODS MARKET',
      'Sep 23, 2026',
      'TOTAL 45.84',
      'TAX 3.34',
    ].join('\n'));

    const review = createReceiptReviewState(extraction, {
      tax: null,
    });

    expect(review.tax).toBeNull();
    expect(review.changedFields).toEqual(['tax']);
  });

  it('maps confirmed receipts into trackable spending entries with source metadata', () => {
    const extraction = parseReceiptText([
      'WHOLE FOODS MARKET',
      'Sep 23, 2026',
      'TOTAL 45.84',
      'TAX 3.34',
    ].join('\n'));

    const review = confirmReceiptReview(createReceiptReviewState(extraction), {}, {
      receiptId: 'receipt_123',
      ingestedAt: new Date('2026-09-23T12:00:00Z'),
    });

    const { entry, history } = createReceiptSpendEntry(review, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
      note: 'Whole Foods Market',
    });

    expect(entry.category).toBe('groceries');
    expect(entry.amount).toBe(45.84);
    expect(entry.source).toBe('receipt');
    expect(entry.receiptId).toBe('receipt_123');
    expect(entry.ingestTimestamp).toBe('2026-09-23T12:00:00.000Z');
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0].id).toBe(entry.id);
  });

  it('blocks creating spend entries from unconfirmed receipt reviews', () => {
    const extraction = parseReceiptText([
      'AMAZON ORDER',
      'Sep 23, 2026',
      'TOTAL 19.99',
    ].join('\n'));

    const review = createReceiptReviewState(extraction, {
      merchant: 'Amazon',
      total: 19.99,
      category: 'other',
    }, { confirmed: false });

    expect(() => createReceiptSpendEntry(review)).toThrow('Receipt review must be confirmed');
  });

  it('maps receipt categories to trackable categories using merchant keywords and known fallbacks', () => {
    const amazonExtraction = parseReceiptText('Amazon order\nSep 23, 2026\nTOTAL 19.99');
    const amazonReview = confirmReceiptReview(createReceiptReviewState(amazonExtraction, {
      merchant: 'Amazon',
      total: 19.99,
      category: 'other',
    }), {}, { receiptId: 'amazon-1', ingestedAt: new Date('2026-09-23T12:00:00Z') });
    const amazonEntry = createReceiptSpendEntry(amazonReview, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
    }).entry;

    const gasExtraction = parseReceiptText('Chevron\nSep 23, 2026\nTOTAL 52.10');
    const gasReview = confirmReceiptReview(createReceiptReviewState(gasExtraction, {
      merchant: 'Chevron',
      total: 52.10,
      category: 'transportation',
    }), {}, { receiptId: 'gas-1', ingestedAt: new Date('2026-09-23T12:00:00Z') });
    const gasEntry = createReceiptSpendEntry(gasReview, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
    }).entry;

    const utilityExtraction = parseReceiptText('Xfinity\nSep 23, 2026\nTOTAL 75.00');
    const utilityReview = confirmReceiptReview(createReceiptReviewState(utilityExtraction, {
      merchant: 'Xfinity',
      total: 75.00,
      category: 'utilities',
    }), {}, { receiptId: 'utility-1', ingestedAt: new Date('2026-09-23T12:00:00Z') });
    const utilityEntry = createReceiptSpendEntry(utilityReview, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
    }).entry;

    const diningExtraction = parseReceiptText('Starbucks\nSep 23, 2026\nTOTAL 8.50');
    const diningReview = confirmReceiptReview(createReceiptReviewState(diningExtraction, {
      merchant: 'Starbucks',
      total: 8.50,
      category: 'food',
    }), {}, { receiptId: 'food-1', ingestedAt: new Date('2026-09-23T12:00:00Z') });
    const diningEntry = createReceiptSpendEntry(diningReview, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
    }).entry;

    const travelExtraction = parseReceiptText('Travel Lodge\nSep 23, 2026\nTOTAL 140.00');
    const travelReview = confirmReceiptReview(createReceiptReviewState(travelExtraction, {
      merchant: 'Travel Lodge',
      total: 140.00,
      category: 'travel',
    }), {}, { receiptId: 'travel-1', ingestedAt: new Date('2026-09-23T12:00:00Z') });
    const travelEntry = createReceiptSpendEntry(travelReview, {
      history: { entries: [], lastUpdated: '2026-09-23T12:00:00.000Z', version: 1 },
    }).entry;

    expect(amazonEntry.category).toBe('online_shopping');
    expect(gasEntry.category).toBe('gas_utility');
    expect(utilityEntry.category).toBe('internet');
    expect(diningEntry.category).toBe('dining_out');
    expect(travelEntry.category).toBe('other');
  });

  it('detects likely duplicate receipts using merchant, date, and amount heuristics', () => {
    const existing = confirmReceiptReview(createReceiptReviewState(parseReceiptText([
      'WHOLE FOODS MARKET',
      'Sep 23, 2026',
      'TOTAL 45.84',
    ].join('\n')), {
      merchant: 'Whole Foods Market',
      total: 45.84,
      category: 'groceries',
    }), {}, { receiptId: 'receipt-duplicate-old', ingestedAt: new Date('2026-09-23T12:00:00Z') });

    const candidate = confirmReceiptReview(createReceiptReviewState(parseReceiptText([
      'WHOLE FOODS MARKET',
      'Sep 23, 2026',
      'TOTAL 45.84',
    ].join('\n')), {
      merchant: 'Whole Foods Market',
      total: 45.84,
      category: 'groceries',
    }), {}, { receiptId: 'receipt-duplicate-new', ingestedAt: new Date('2026-09-23T12:00:05Z') });

    const duplicate = evaluateReceiptDuplicateRisk(existing, candidate);

    expect(duplicate.matches).toBe(3);
    expect(duplicate.risk.isDuplicate).toBe(true);
    expect(duplicate.risk.action).toBe('merge');
    expect(duplicate.risk.score).toBeGreaterThanOrEqual(0.75);
  });
});

import { DEFAULT_INPUTS } from '../defaultScenarios';
import { calculateBudgetBreakdown } from '../budgetCalculations';
import {
  createShareableBudgetUrl,
  decodeBudgetInputsFromShare,
  encodeBudgetInputsForShare,
  exportBudgetQuickSummary,
  loadBudgetInputsFromShareUrl,
  SHARE_PAYLOAD_VERSION,
} from '../storage';
import { Buffer as NodeBuffer } from 'node:buffer';

describe('shareable budget URL helpers', () => {
  it('round-trips budget inputs through encoded payload', () => {
    const encoded = encodeBudgetInputsForShare(DEFAULT_INPUTS);
    const decoded = decodeBudgetInputsFromShare(encoded);

    expect(decoded).toEqual(DEFAULT_INPUTS);
  });

  it('keeps share payload compact for mostly-default budgets', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: DEFAULT_INPUTS.annualSalary + 1000,
      rent: DEFAULT_INPUTS.rent + 50,
    };

    const compactEncoded = encodeBudgetInputsForShare(inputs);
    const legacyEncoded = NodeBuffer.from(JSON.stringify(inputs), 'utf-8').toString('base64url');

    expect(compactEncoded.length).toBeLessThan(legacyEncoded.length);
  });

  it('decodes legacy full-input payloads for backward compatibility', () => {
    const legacyEncoded = NodeBuffer.from(JSON.stringify(DEFAULT_INPUTS), 'utf-8').toString('base64url');
    const decoded = decodeBudgetInputsFromShare(legacyEncoded);

    expect(decoded).toEqual(DEFAULT_INPUTS);
  });

  it('returns null for unsupported versioned payloads', () => {
    const encoded = NodeBuffer.from(
      JSON.stringify({ v: SHARE_PAYLOAD_VERSION + 1, i: { annualSalary: 1 } }),
      'utf-8'
    ).toString('base64url');
    expect(decodeBudgetInputsFromShare(encoded)).toBeNull();
  });

  it('returns null for versioned payloads with null inputs', () => {
    const encoded = NodeBuffer.from(
      JSON.stringify({ v: SHARE_PAYLOAD_VERSION, i: null }),
      'utf-8'
    ).toString('base64url');
    expect(decodeBudgetInputsFromShare(encoded)).toBeNull();
  });

  describe('exportBudgetQuickSummary', () => {
    it('returns a markdown-like plain-text summary with core totals', () => {
      const summary = exportBudgetQuickSummary(DEFAULT_INPUTS);
      const isOverBudget = calculateBudgetBreakdown(DEFAULT_INPUTS).isOverBudget;

      expect(summary).toContain('DynamicBudget Quick Summary');
      expect(summary).toContain('| Category | Monthly | Annual |');
      expect(summary).toContain('| Net Monthly Income |');
      expect(summary).toContain('| Total Allocated |');
      expect(summary).toContain('| Remaining Buffer |');
      expect(summary).toContain('State: California · Filing: Single · Housing: Renter');
      expect(summary).toMatch(/Budget Health Score: \d+\/100 \((-?\d+(\.\d+)?)% net savings rate\)/);
      expect(summary).toContain(isOverBudget ? '⚠️ Over budget by' : '✅ Under budget by');
    });

    it('formats state and enum labels for sharing', () => {
      const summary = exportBudgetQuickSummary({
        ...DEFAULT_INPUTS,
        state: 'no_state_tax',
        filingStatus: 'married_jointly',
        housingMode: 'homeowner',
      });

      expect(summary).toContain('State: No State Income Tax · Filing: Married Jointly · Housing: Homeowner');
      expect(summary).not.toContain('no_state_tax');
      expect(summary).not.toContain('married_jointly');
    });
  });

  it('creates a share URL and loads budget inputs back from it', () => {
    const baseUrl = 'https://example.com/app?tab=budget';
    const shareUrl = createShareableBudgetUrl(DEFAULT_INPUTS, baseUrl);
    const loaded = loadBudgetInputsFromShareUrl(shareUrl);

    const parsedUrl = new URL(shareUrl);
    expect(parsedUrl.searchParams.has('b')).toBe(true);
    expect(parsedUrl.searchParams.has('tab')).toBe(true);
    expect(loaded).toEqual(DEFAULT_INPUTS);
  });

  it('returns null for malformed payloads', () => {
    expect(decodeBudgetInputsFromShare('%%%')).toBeNull();
    expect(loadBudgetInputsFromShareUrl('https://example.com/app?b=%%%')).toBeNull();
  });

  it('supports browser btoa/atob fallback when Buffer is unavailable', () => {
    const originalBuffer = (globalThis as unknown as { Buffer?: typeof NodeBuffer }).Buffer;
    const originalBtoa = globalThis.btoa;
    const originalAtob = globalThis.atob;

    (globalThis as unknown as { Buffer?: typeof NodeBuffer }).Buffer = undefined;
    globalThis.btoa = (value: string) => NodeBuffer.from(value, 'binary').toString('base64');
    globalThis.atob = (value: string) => NodeBuffer.from(value, 'base64').toString('binary');

    try {
      const encoded = encodeBudgetInputsForShare(DEFAULT_INPUTS);
      const decoded = decodeBudgetInputsFromShare(encoded);
      expect(decoded).toEqual(DEFAULT_INPUTS);
    } finally {
      (globalThis as unknown as { Buffer?: typeof NodeBuffer }).Buffer = originalBuffer;
      globalThis.btoa = originalBtoa;
      globalThis.atob = originalAtob;
    }
  });
});

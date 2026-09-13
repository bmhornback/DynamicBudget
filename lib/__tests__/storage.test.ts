import { DEFAULT_INPUTS } from '../defaultScenarios';
import {
  createShareableBudgetUrl,
  decodeBudgetInputsFromShare,
  encodeBudgetInputsForShare,
  exportBudgetQuickSummary,
  loadBudgetInputsFromShareUrl,
} from '../storage';
import { Buffer as NodeBuffer } from 'node:buffer';

describe('shareable budget URL helpers', () => {
  it('round-trips budget inputs through encoded payload', () => {
    const encoded = encodeBudgetInputsForShare(DEFAULT_INPUTS);
    const decoded = decodeBudgetInputsFromShare(encoded);

    expect(decoded).toEqual(DEFAULT_INPUTS);
  });

  describe('exportBudgetQuickSummary', () => {
    it('returns a markdown-like plain-text summary with core totals', () => {
      const summary = exportBudgetQuickSummary(DEFAULT_INPUTS);

      expect(summary).toContain('DynamicBudget Quick Summary');
      expect(summary).toContain('| Category | Monthly | Annual |');
      expect(summary).toContain('| Net Monthly Income |');
      expect(summary).toContain('| Total Allocated |');
      expect(summary).toContain('| Remaining Buffer |');
      expect(summary).toContain('Budget Health Score:');
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

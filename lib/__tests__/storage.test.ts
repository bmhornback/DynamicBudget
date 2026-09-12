import { DEFAULT_INPUTS } from '../defaultScenarios';
import {
  createShareableBudgetUrl,
  decodeBudgetInputsFromShare,
  encodeBudgetInputsForShare,
  loadBudgetInputsFromShareUrl,
} from '../storage';

describe('shareable budget URL helpers', () => {
  it('round-trips budget inputs through encoded payload', () => {
    const encoded = encodeBudgetInputsForShare(DEFAULT_INPUTS);
    const decoded = decodeBudgetInputsFromShare(encoded);

    expect(decoded).toEqual(DEFAULT_INPUTS);
  });

  it('creates a share URL and loads budget inputs back from it', () => {
    const baseUrl = 'https://example.com/app?tab=budget';
    const shareUrl = createShareableBudgetUrl(DEFAULT_INPUTS, baseUrl);
    const loaded = loadBudgetInputsFromShareUrl(shareUrl);

    expect(shareUrl).toContain('?tab=budget&b=');
    expect(loaded).toEqual(DEFAULT_INPUTS);
  });

  it('returns null for malformed payloads', () => {
    expect(decodeBudgetInputsFromShare('%%%')).toBeNull();
    expect(loadBudgetInputsFromShareUrl('https://example.com/app?b=%%%')).toBeNull();
  });
});

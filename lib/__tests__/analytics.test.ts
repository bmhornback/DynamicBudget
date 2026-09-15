/** @jest-environment jsdom */

import { clearAnalyticsCounts, loadAnalyticsCounts, trackAnalyticsEvent } from '@/lib/analytics';

describe('analytics helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('tracks aggregate event counts in local storage', () => {
    trackAnalyticsEvent('preset_applied');
    trackAnalyticsEvent('preset_applied');
    trackAnalyticsEvent('feedback_submitted');

    expect(loadAnalyticsCounts()).toEqual({
      preset_applied: 2,
      feedback_submitted: 1,
    });
  });

  it('clears stored analytics counts', () => {
    trackAnalyticsEvent('rebalance_run');
    clearAnalyticsCounts();

    expect(loadAnalyticsCounts()).toEqual({});
  });
});

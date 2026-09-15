const ANALYTICS_STORAGE_KEY = 'dynamicbudget_analytics_counts';

export type AnalyticsEventName =
  | 'preset_applied'
  | 'saved_budget_loaded'
  | 'rebalance_run'
  | 'feedback_submitted'
  | 'learn_cta_clicked';

export function trackAnalyticsEvent(eventName: AnalyticsEventName): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = loadAnalyticsCounts();
    const next = {
      ...existing,
      [eventName]: (existing[eventName] ?? 0) + 1,
    };
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort only
  }
}

export function loadAnalyticsCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const filteredEntries = Object.entries(parsed).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1])
    );
    return Object.fromEntries(filteredEntries);
  } catch {
    return {};
  }
}

export function clearAnalyticsCounts(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch {
    // best-effort only
  }
}

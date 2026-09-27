"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAnalyticsEvent = trackAnalyticsEvent;
exports.loadAnalyticsCounts = loadAnalyticsCounts;
exports.clearAnalyticsCounts = clearAnalyticsCounts;
const ANALYTICS_STORAGE_KEY = 'dynamicbudget_analytics_counts';
function trackAnalyticsEvent(eventName) {
    if (typeof window === 'undefined')
        return;
    try {
        const existing = loadAnalyticsCounts();
        const next = {
            ...existing,
            [eventName]: (existing[eventName] ?? 0) + 1,
        };
        window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(next));
    }
    catch {
        // best-effort only
    }
}
function loadAnalyticsCounts() {
    if (typeof window === 'undefined')
        return {};
    try {
        const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        const filteredEntries = Object.entries(parsed).filter((entry) => typeof entry[1] === 'number' && Number.isFinite(entry[1]));
        return Object.fromEntries(filteredEntries);
    }
    catch {
        return {};
    }
}
function clearAnalyticsCounts() {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    }
    catch {
        // best-effort only
    }
}

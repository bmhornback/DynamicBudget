'use client';

import React, { useMemo, useState } from 'react';
import type { BudgetInputs } from '@/types/budget';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { exportBudgetQuickSummary } from '@/lib/storage';

const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Bug or broken behavior' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'education', label: 'Learn/content feedback' },
  { value: 'ux', label: 'UX or accessibility' },
  { value: 'other', label: 'Other' },
] as const;

interface FeedbackWidgetProps {
  currentInputs?: BudgetInputs;
}

export default function FeedbackWidget({ currentInputs }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]['value']>('feature');
  const [message, setMessage] = useState('');
  const [includeBudgetSummary, setIncludeBudgetSummary] = useState(false);

  const issueUrl = useMemo(() => {
    const categoryLabel = FEEDBACK_CATEGORIES.find((item) => item.value === category)?.label ?? 'Feedback';
    const title = `[Feedback] ${categoryLabel}`;
    const summaryBlock = includeBudgetSummary && currentInputs
      ? `\n## Budget Context\n\`\`\`\n${exportBudgetQuickSummary(currentInputs)}\n\`\`\`\n`
      : '';
    const body = [
      '## Feedback Category',
      categoryLabel,
      '',
      '## What would you like to share?',
      message || '(Please add your notes here before submitting.)',
      summaryBlock,
      '## What were you trying to do?',
      '',
      '## What outcome did you expect?',
      '',
    ].join('\n');

    return `https://github.com/bmhornback/DynamicBudget/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }, [category, currentInputs, includeBudgetSummary, message]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      >
        💬 Feedback
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Send feedback"
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Send feedback</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close feedback dialog"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This opens a prefilled GitHub issue so feedback stays in the project backlog.
            </p>

            <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Details
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="What should we improve?"
                className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            {currentInputs && (
              <label className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeBudgetSummary}
                  onChange={(event) => setIncludeBudgetSummary(event.target.checked)}
                  className="mt-0.5"
                />
                <span>Include a plain-text budget summary for context</span>
              </label>
            )}

            <div className="mt-4 flex gap-2">
              <a
                href={issueUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackAnalyticsEvent('feedback_submitted');
                  setOpen(false);
                }}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                Open GitHub issue
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

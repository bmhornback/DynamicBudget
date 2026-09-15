'use client';

import React, { useState } from 'react';

const ONBOARDING_KEY = 'dynamicbudget_onboarding_seen';

export default function OnboardingCard() {
  // Lazy initializer reads localStorage once; avoids setState-in-effect lint error
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // localStorage unavailable — dismiss in-memory only
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome to DynamicBudget"
      aria-modal="false"
      className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4 relative"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome card"
        className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
      >
        ×
      </button>

      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🧮</span>
        <div className="space-y-3 pr-4">
          <h2 className="text-sm font-bold text-blue-800 dark:text-blue-200">Welcome to DynamicBudget!</h2>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Enter your salary and expenses to instantly see your tax-adjusted budget. Here&apos;s how to get started:
          </p>
          <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">📋</span>
              <span><strong>Presets</strong> — Load a sample scenario (San Diego, Atlanta, etc.) to see a realistic starting budget.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">⚡</span>
              <span><strong>Auto vs Manual mode</strong> — <em>Auto</em> rebalances your budget automatically as you type. <em>Manual</em> gives you full control.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">🔒</span>
              <span><strong>Field locking</strong> — Click the lock icon on any field to protect it from automatic rebalancing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">💾</span>
              <span><strong>Save budgets</strong> — Use <em>My Budgets</em> to save and reload named budget snapshots anytime.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">🆚</span>
              <span><strong>Compare scenarios</strong> — Mix presets and saved budgets in the comparison table to see tradeoffs before switching.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 shrink-0 mt-0.5">↩️</span>
              <span><strong>Undo major actions</strong> — Reset, imports, and scenario loads now show an undo option so you can recover quickly.</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={dismiss}
            className="mt-1 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors"
          >
            Got it — Let&apos;s go!
          </button>
        </div>
      </div>
    </div>
  );
}

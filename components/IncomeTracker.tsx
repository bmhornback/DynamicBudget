'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { IncomeHistory } from '@/types/budget';
import { addIncomeEntry } from '@/lib/incomeTrends';

interface IncomeTrackerProps {
  incomeHistory: IncomeHistory | undefined;
  onHistoryChange: (history: IncomeHistory) => void;
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export default function IncomeTracker({ incomeHistory, onHistoryChange }: IncomeTrackerProps) {
  const [month, setMonth] = useState(currentMonthValue());
  const [basePay, setBasePay] = useState('');
  const [commission, setCommission] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!incomeHistory) return false;
    const base = Number(basePay);
    const comm = Number(commission || '0');
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim()) && base > 0 && comm >= 0;
  }, [basePay, commission, incomeHistory, month]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!incomeHistory || !canSubmit) return;

    setIsSubmitting(true);
    try {
      const updated = addIncomeEntry(
        incomeHistory,
        month,
        Number(basePay),
        Number(commission || '0'),
        note || undefined
      );
      onHistoryChange(updated);
      setBasePay('');
      setCommission('');
      setNote('');
      setMonth(currentMonthValue());
    } finally {
      setIsSubmitting(false);
    }
  }, [basePay, canSubmit, commission, incomeHistory, month, note, onHistoryChange]);

  if (!incomeHistory) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        💵 Log Income
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="income-month" className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <input
            id="income-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div>
          <label htmlFor="base-pay" className="block text-sm font-medium text-gray-700 mb-1">
            Base Pay ($)
          </label>
          <input
            id="base-pay"
            type="number"
            min="0"
            step="0.01"
            value={basePay}
            onChange={(e) => setBasePay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label htmlFor="commission-pay" className="block text-sm font-medium text-gray-700 mb-1">
            Commission ($)
          </label>
          <input
            id="commission-pay"
            type="number"
            min="0"
            step="0.01"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="income-note" className="block text-sm font-medium text-gray-700 mb-1">
            Note (optional)
          </label>
          <input
            id="income-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g., Enterprise close"
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
        >
          {isSubmitting ? 'Adding...' : 'Add Income Entry'}
        </button>
      </form>
    </div>
  );
}


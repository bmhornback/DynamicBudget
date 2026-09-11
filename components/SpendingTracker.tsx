'use client';

import React, { useState, useCallback } from 'react';
import type { TrackableCategory, SpendingHistory } from '@/types/budget';
import { CATEGORY_CONFIG, addSpendingEntry } from '@/lib/spendingTrends';

interface SpendingTrackerProps {
  spendingHistory: SpendingHistory | undefined;
  onHistoryChange: (history: SpendingHistory) => void;
}

export default function SpendingTracker({
  spendingHistory,
  onHistoryChange,
}: SpendingTrackerProps) {
  const [category, setCategory] = useState<TrackableCategory>('dining_out');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!spendingHistory || !amount || parseFloat(amount) <= 0) return;

      setIsSubmitting(true);
      try {
        const updatedHistory = addSpendingEntry(
          spendingHistory,
          category,
          parseFloat(amount),
          date,
          note || undefined
        );
        onHistoryChange(updatedHistory);

        // Reset form
        setAmount('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
      } finally {
        setIsSubmitting(false);
      }
    },
    [spendingHistory, category, amount, date, note, onHistoryChange]
  );

  if (!spendingHistory) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        💰 Log Spending
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TrackableCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ($)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Note */}
        <div>
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
            Note (optional)
          </label>
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Lunch with team"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
        >
          {isSubmitting ? 'Adding...' : 'Add Spending'}
        </button>
      </form>
    </div>
  );
}

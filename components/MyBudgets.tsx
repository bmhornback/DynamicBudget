'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BudgetInputs, NamedBudget } from '@/types/budget';
import {
  loadNamedBudgets,
  saveNamedBudget,
  deleteNamedBudget,
} from '@/lib/storage';

interface MyBudgetsProps {
  currentInputs: BudgetInputs;
  onLoad: (inputs: BudgetInputs) => void;
}

export default function MyBudgets({ currentInputs, onLoad }: MyBudgetsProps) {
  const [budgets, setBudgets] = useState<NamedBudget[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load from storage on mount and whenever panel opens
  useEffect(() => {
    if (open) {
      setBudgets(loadNamedBudgets());
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const budget: NamedBudget = {
      id: crypto.randomUUID(),
      name: trimmed,
      inputs: currentInputs,
      createdAt: new Date().toISOString(),
    };
    saveNamedBudget(budget);
    setBudgets(loadNamedBudgets());
    setNewName('');
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    deleteNamedBudget(id);
    setBudgets(loadNamedBudgets());
  };

  const handleLoad = (budget: NamedBudget) => {
    onLoad(budget.inputs);
    setOpen(false);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:text-blue-400"
      >
        💾 My Budgets {budgets.length > 0 && <span className="ml-1 text-blue-500 dark:text-blue-400">({budgets.length})</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="My Saved Budgets"
          className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Saved Budgets</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Save current budget */}
          {saving ? (
            <div className="flex gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false); }}
                placeholder="Budget name…"
                maxLength={50}
                className="flex-1 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!newName.trim()}
                className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSaving(false)}
                className="px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="w-full text-xs text-left px-3 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              + Save current budget…
            </button>
          )}

          {/* Saved budget list */}
          {budgets.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No saved budgets yet.</p>
          ) : (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {budgets.map((budget) => (
                <li
                  key={budget.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                >
                  <button
                    type="button"
                    onClick={() => handleLoad(budget)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{budget.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{formatDate(budget.createdAt)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(budget.id)}
                    title="Delete budget"
                    aria-label={`Delete ${budget.name}`}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 dark:hover:text-red-400 text-sm transition-opacity"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

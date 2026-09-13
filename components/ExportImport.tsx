'use client';

import React, { useRef, useState } from 'react';
import type { BudgetInputs } from '@/types/budget';
import {
  exportBudgetAsJSON,
  exportBudgetAsCSV,
  importBudgetFromJSON,
  triggerDownload,
  todayDateStr,
  createShareableBudgetUrl,
  exportBudgetQuickSummary,
} from '@/lib/storage';

interface ExportImportProps {
  currentInputs: BudgetInputs;
  onImport: (inputs: BudgetInputs) => void;
  onExportPDF: () => void;
}

export default function ExportImport({ currentInputs, onImport, onExportPDF }: ExportImportProps) {
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const json = exportBudgetAsJSON(currentInputs);
    triggerDownload(json, `dynamicbudget-budget-${todayDateStr()}.json`, 'application/json');
    setOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportBudgetAsCSV(currentInputs);
    triggerDownload(csv, `dynamicbudget-budget-${todayDateStr()}.csv`, 'text/csv');
    setOpen(false);
  };

  const handleExportPDF = () => {
    setOpen(false);
    onExportPDF();
  };

  const handleImportClick = () => {
    setImportError(null);
    setShareMessage(null);
    fileInputRef.current?.click();
  };

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      setShareMessage('Copy failed: clipboard not available.');
      return;
    }

    try {
      const shareUrl = createShareableBudgetUrl(currentInputs, window.location.href);
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('Share link copied.');
    } catch {
      setShareMessage('Copy failed. Please try again.');
    }
  };

  const handleCopySummary = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      setShareMessage('Copy failed: clipboard not available.');
      return;
    }

    try {
      await navigator.clipboard.writeText(exportBudgetQuickSummary(currentInputs));
      setShareMessage('Summary copied.');
    } catch {
      setShareMessage('Copy failed. Please try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        setImportError('Could not read the file. Please try again.');
        return;
      }
      const imported = importBudgetFromJSON(result);
      if (imported) {
        onImport(imported);
        setOpen(false);
        setImportError(null);
      } else {
        setImportError('The file is incompatible or from a different version. Please export a fresh copy.');
      }
    };
    reader.onerror = () => {
      setImportError('Could not read the file. Please try again.');
    };
    reader.readAsText(file);

    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setImportError(null); setShareMessage(null); }}
        aria-label="Export or import budget"
        aria-expanded={open}
        className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all"
      >
        ↕ Export / Import
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown panel */}
          <div aria-label="Export / Import options" className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-1">
              Export
            </p>

            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-800 dark:text-gray-200 transition-colors"
            >
              🖨️ Export as PDF
              <span className="block text-xs text-gray-400 dark:text-gray-500">Print-friendly dashboard summary</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200 transition-colors"
            >
              📄 Export as JSON
              <span className="block text-xs text-gray-400 dark:text-gray-500">Full backup — re-importable</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-800 dark:text-gray-200 transition-colors"
            >
              📊 Export as CSV
              <span className="block text-xs text-gray-400 dark:text-gray-500">Monthly &amp; annual columns</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-800 dark:text-gray-200 transition-colors"
            >
              🔗 Copy Share Link
              <span className="block text-xs text-gray-400 dark:text-gray-500">Loads this budget directly from URL</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-gray-800 dark:text-gray-200 transition-colors"
            >
              📝 Copy Summary
              <span className="block text-xs text-gray-400 dark:text-gray-500">Plain-text budget summary for Slack/Notion</span>
            </button>

            {shareMessage && (
              <p
                role="status"
                aria-live="polite"
                className={`px-1 text-xs ${
                  shareMessage.toLowerCase().includes('failed')
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {shareMessage}
              </p>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-1">
                Import
              </p>

              <button
                type="button"
                onClick={handleImportClick}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-800 dark:text-gray-200 transition-colors"
              >
                📂 Import JSON
                <span className="block text-xs text-gray-400 dark:text-gray-500">Restore a previous backup</span>
              </button>

              {importError && (
                <p className="mt-1 px-1 text-xs text-red-600 dark:text-red-400">{importError}</p>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-hidden="true"
              onChange={handleFileChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

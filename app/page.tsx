'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BudgetInputs, RebalanceStrategy, SurplusAllocation, RebalanceResult, SpendingHistory } from '@/types/budget';
import { DEFAULT_INPUTS, SCENARIO_PRESETS, applyScenarioPreset } from '@/lib/defaultScenarios';
import { calculateBudgetBreakdown } from '@/lib/budgetCalculations';
import { calculateBudgetHealthScore } from '@/lib/budgetHealthScore';
import { generateRecommendations } from '@/lib/recommendations';
import { rebalanceBudget } from '@/lib/rebalanceBudget';
import {
  buildScenarioComparisonItems,
  getDefaultComparisonPresetIds,
  normalizeComparisonPresetIds,
} from '@/lib/scenarioComparison';
import { initializeSpendingHistory } from '@/lib/spendingTrends';
import { saveBudgetInputs, loadBudgetInputs } from '@/lib/storage';
import BudgetForm from '@/components/BudgetForm';
import BudgetDashboard from '@/components/BudgetDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import ScenarioPresets from '@/components/ScenarioPresets';
import RebalanceControls from '@/components/RebalanceControls';
import ScenarioComparison from '@/components/ScenarioComparison';
import SpendingTracker from '@/components/SpendingTracker';
import TrendAnalysis from '@/components/TrendAnalysis';

// ─── Module-level constants ───────────────────────────────────────────────────
// Savings fields that should be locked/unlocked when toggling percentage mode
const SAVINGS_FIELDS = [
  'emergencyFundContribution',
  'houseDownPaymentContribution',
  'taxableInvestments',
  'generalCashSavings',
  'extraDebtPayoff',
] as const;
const DEFAULT_SAVINGS_PERCENT = DEFAULT_INPUTS.savingsPercentOfNetIncome;

export default function MoveMathPage() {
  // Initialize from localStorage if available, otherwise use defaults
  const [inputs, setInputs] = useState<BudgetInputs>(() => {
    const stored = loadBudgetInputs();
    if (stored) return stored;
    const defaults = { ...DEFAULT_INPUTS };
    if (!defaults.spendingHistory) {
      defaults.spendingHistory = initializeSpendingHistory();
    }
    return defaults;
  });
  
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
  const [activePreset, setActivePreset] = useState<string | undefined>('san_diego_baseline');
  const [showForm, setShowForm] = useState(true);
  const [activeTab, setActiveTab] = useState<'budget' | 'trends'>('budget');
  const [comparisonPresetIds, setComparisonPresetIds] = useState<string[]>(
    () => getDefaultComparisonPresetIds('san_diego_baseline')
  );
  const previousSavingsFieldLocks = useRef<Record<string, boolean>>({});

  // ── Load from localStorage on mount ──────────────────────────────────────
  // (handled in useState initializer above)

  // ── Auto-save to localStorage ────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveBudgetInputs(inputs);
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timer);
  }, [inputs]);

  // ── Derived calculations (memoized) ────────────────────────────────────────
  const breakdown = useMemo(() => calculateBudgetBreakdown(inputs), [inputs]);
  const healthScore = useMemo(() => calculateBudgetHealthScore(breakdown), [breakdown]);
  const recommendations = useMemo(
    () => generateRecommendations(inputs, breakdown),
    [inputs, breakdown]
  );
  const comparisonItems = useMemo(
    () => buildScenarioComparisonItems(inputs, comparisonPresetIds, activePreset),
    [inputs, comparisonPresetIds, activePreset]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = useCallback((updates: Partial<BudgetInputs>) => {
    setInputs((prev) => {
      let next = { ...prev, ...updates };
      
      // Auto-lock individual savings fields when entering percentage mode
      // to prevent confusion about which fields are actually used
      if (updates.isSavingsByPercentage === true && !prev.isSavingsByPercentage) {
        previousSavingsFieldLocks.current = SAVINGS_FIELDS.reduce<Record<string, boolean>>(
          (acc, field) => {
            acc[field] = Boolean(prev.lockedFields[field]);
            return acc;
          },
          {}
        );
        const newLockedFields = { ...next.lockedFields };
        SAVINGS_FIELDS.forEach(field => {
          newLockedFields[field] = true;
        });
        const savingsPercentOfNetIncome = Number.isFinite(next.savingsPercentOfNetIncome)
          ? next.savingsPercentOfNetIncome
          : DEFAULT_SAVINGS_PERCENT;
        next = { ...next, lockedFields: newLockedFields, savingsPercentOfNetIncome };
      }
      
      // Auto-unlock individual savings fields when exiting percentage mode
      if (updates.isSavingsByPercentage === false && prev.isSavingsByPercentage) {
        const newLockedFields = { ...next.lockedFields };
        SAVINGS_FIELDS.forEach(field => {
          if (previousSavingsFieldLocks.current[field]) {
            newLockedFields[field] = true;
          } else {
            delete newLockedFields[field];
          }
        });
        previousSavingsFieldLocks.current = {};
        next = { ...next, lockedFields: newLockedFields };
      }
      
      if (prev.budgetMode === 'auto') {
        const result = rebalanceBudget(next, next.rebalanceStrategy, next.surplusAllocation);
        setRebalanceResult(result);
        return result.updatedInputs;
      }
      return next;
    });
    setActivePreset(undefined);
    setComparisonPresetIds((prev) => normalizeComparisonPresetIds(prev));
  }, []);

  const handleToggleLock = useCallback((fieldId: string) => {
    setInputs((prev) => ({
      ...prev,
      lockedFields: {
        ...prev.lockedFields,
        [fieldId]: !prev.lockedFields[fieldId],
      },
    }));
  }, []);

  const handleApplyPreset = useCallback((newInputs: BudgetInputs, presetId?: string) => {
    setInputs(newInputs);
    setRebalanceResult(null);
    setActivePreset(presetId);
    setComparisonPresetIds((prev) => {
      const normalized = normalizeComparisonPresetIds(prev, presetId);
      return normalized.length > 0 ? normalized : getDefaultComparisonPresetIds(presetId);
    });
  }, []);

  const handleStrategyChange = useCallback((strategy: RebalanceStrategy) => {
    setInputs((prev) => ({ ...prev, rebalanceStrategy: strategy }));
  }, []);

  const handleSurplusAllocationChange = useCallback((allocation: SurplusAllocation) => {
    setInputs((prev) => ({ ...prev, surplusAllocation: allocation }));
  }, []);

  const handleRebalance = useCallback(() => {
    const result = rebalanceBudget(inputs, inputs.rebalanceStrategy, inputs.surplusAllocation);
    setRebalanceResult(result);
    setInputs(result.updatedInputs);
  }, [inputs]);

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setRebalanceResult(null);
    setActivePreset('san_diego_baseline');
    setComparisonPresetIds(getDefaultComparisonPresetIds('san_diego_baseline'));
  }, []);

  const handleToggleMode = useCallback(() => {
    setInputs((prev) => ({
      ...prev,
      budgetMode: prev.budgetMode === 'auto' ? 'manual' : 'auto',
    }));
  }, []);

  const handleSpendingHistoryChange = useCallback(
    (history: SpendingHistory) => {
      setInputs((prev) => ({
        ...prev,
        spendingHistory: history,
      }));
    },
    []
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">MoveMath</h1>
              <p className="text-xs text-gray-500">Dynamic Salary → Budget Planner</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMode}
              aria-pressed={inputs.budgetMode === 'auto'}
              aria-label={`Budget mode: ${inputs.budgetMode === 'auto' ? 'Auto' : 'Manual'}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                inputs.budgetMode === 'auto'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {inputs.budgetMode === 'auto' ? '⚡ Auto' : '✋ Manual'}
            </button>

            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              aria-pressed={showForm}
              aria-label={showForm ? 'Show dashboard panel' : 'Show editor panel'}
              className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:border-blue-300 transition-all md:hidden"
            >
              {showForm ? '📊 Dashboard' : '✏️ Edit'}
            </button>

            <div role="tablist" aria-label="Primary views" className="flex items-center gap-2">
              <button
                id="budget-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === 'budget'}
                aria-controls="budget-panel"
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeTab === 'budget'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                📊 Budget
              </button>

              <button
                id="trends-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === 'trends'}
                aria-controls="trends-panel"
                onClick={() => setActiveTab('trends')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeTab === 'trends'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                }`}
              >
                📈 Trends
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scenario presets bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-500 shrink-0">Presets:</span>
            <ScenarioPresets
              currentPreset={activePreset}
              onApplyPreset={handleApplyPreset}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ErrorBoundary onReset={handleReset}>
          {activeTab === 'budget' ? (
            <div id="budget-panel" role="tabpanel" aria-labelledby="budget-tab" className="space-y-6">
              <ScenarioComparison
                items={comparisonItems}
                selectedPresetIds={comparisonPresetIds}
                onSelectionChange={(presetIds) =>
                  setComparisonPresetIds(normalizeComparisonPresetIds(presetIds, activePreset))
                }
                onApplyPreset={(presetId) => {
                  const preset = SCENARIO_PRESETS.find((item) => item.id === presetId);
                  if (!preset) return;
                  handleApplyPreset(applyScenarioPreset(preset.inputs), preset.id);
                }}
              />

              <div className="flex flex-col md:flex-row gap-6">
                <aside className={`w-full md:w-96 md:shrink-0 ${showForm ? 'block' : 'hidden md:block'}`}>
                  <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                    <RebalanceControls
                      inputs={inputs}
                      rebalanceResult={rebalanceResult}
                      onStrategyChange={handleStrategyChange}
                      onSurplusAllocationChange={handleSurplusAllocationChange}
                      onRebalance={handleRebalance}
                      onReset={handleReset}
                    />
                    <BudgetForm
                      inputs={inputs}
                      onChange={handleChange}
                      onToggleLock={handleToggleLock}
                    />
                  </div>
                </aside>

                <div className={`flex-1 min-w-0 ${!showForm ? 'block' : 'hidden md:block'}`}>
                  <BudgetDashboard
                    breakdown={breakdown}
                    inputs={inputs}
                    healthScore={healthScore}
                    recommendations={recommendations}
                    rebalanceResult={rebalanceResult}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div id="trends-panel" role="tabpanel" aria-labelledby="trends-tab" className="flex flex-col md:flex-row gap-6">
              <aside className={`w-full md:w-96 md:shrink-0 ${showForm ? 'block' : 'hidden md:block'}`}>
                <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                  <SpendingTracker
                    spendingHistory={inputs.spendingHistory}
                    onHistoryChange={handleSpendingHistoryChange}
                  />
                </div>
              </aside>

              <div className={`flex-1 min-w-0 ${!showForm ? 'block' : 'hidden md:block'}`}>
                <TrendAnalysis
                  spendingHistory={inputs.spendingHistory}
                  inputs={inputs}
                />
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400">
          <p>MoveMath — Personal finance planning tool. All calculations are client-side estimates only.</p>
          <p className="mt-1">Tax figures are simplified estimates and should not be used for tax filing purposes.</p>
        </div>
      </footer>
    </div>
  );
}

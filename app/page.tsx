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
import { calculateDebtPayoffProjection } from '@/lib/debtPayoff';
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
import BusinessExpensesGuide from '@/components/BusinessExpensesGuide';
import MyBudgets from '@/components/MyBudgets';
import OnboardingCard from '@/components/OnboardingCard';
import { DarkModeToggle } from '@/components/ThemeProvider';
import ExportImport from '@/components/ExportImport';

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

export default function DynamicBudgetPage() {
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
  const [activeTab, setActiveTab] = useState<'budget' | 'trends' | 'business_expenses'>('budget');
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
  const debtProjection = useMemo(
    () => calculateDebtPayoffProjection(inputs.debts, inputs.extraDebtPayoff),
    [inputs.debts, inputs.extraDebtPayoff]
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

  const handleImport = useCallback((newInputs: BudgetInputs) => {
    setInputs(newInputs);
    setRebalanceResult(null);
    setActivePreset(undefined);
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">DynamicBudget</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dynamic Salary → Budget Planner</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MyBudgets currentInputs={inputs} onLoad={(newInputs) => { setInputs(newInputs); setRebalanceResult(null); setActivePreset(undefined); }} />

            <ExportImport currentInputs={inputs} onImport={handleImport} />

            <DarkModeToggle />

            <button
              type="button"
              onClick={handleToggleMode}
              aria-pressed={inputs.budgetMode === 'auto'}
              aria-label={`Budget mode: ${inputs.budgetMode === 'auto' ? 'Auto' : 'Manual'}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                inputs.budgetMode === 'auto'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              {inputs.budgetMode === 'auto' ? '⚡ Auto' : '✋ Manual'}
            </button>

            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              aria-label={showForm ? 'Show dashboard panel' : 'Show editor panel'}
              className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all md:hidden"
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
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
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
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500'
                }`}
              >
                📈 Trends
              </button>

              <button
                id="business-expenses-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === 'business_expenses'}
                aria-controls="business-expenses-panel"
                onClick={() => setActiveTab('business_expenses')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeTab === 'business_expenses'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500'
                }`}
              >
                🧾 Business
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scenario presets bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Presets:</span>
            <ScenarioPresets
              currentPreset={activePreset}
              onApplyPreset={handleApplyPreset}
              currentInputs={inputs}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ErrorBoundary onReset={handleReset}>
          {activeTab === 'budget' ? (
            <div id="budget-panel" role="tabpanel" aria-labelledby="budget-tab" className="space-y-6">
              <OnboardingCard />
              <ScenarioComparison
                items={comparisonItems}
                selectedPresetIds={comparisonPresetIds}
                activePresetId={activePreset}
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
                    debtProjection={debtProjection}
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'trends' ? (
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
          ) : (
            <div id="business-expenses-panel" role="tabpanel" aria-labelledby="business-expenses-tab">
              <BusinessExpensesGuide />
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 dark:border-gray-700 py-6 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>DynamicBudget — Personal finance planning tool. All calculations are client-side estimates only.</p>
          <p className="mt-1">Tax figures are simplified estimates and should not be used for tax filing purposes.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { BudgetInputs, NamedBudget, RebalanceStrategy, SurplusAllocation, RebalanceResult, SpendingHistory } from '@/types/budget';
import { DEFAULT_INPUTS, SCENARIO_PRESETS, applyScenarioPreset } from '@/lib/defaultScenarios';
import { calculateBudgetBreakdown } from '@/lib/budgetCalculations';
import { calculateBudgetHealthScore } from '@/lib/budgetHealthScore';
import { generateRecommendations } from '@/lib/recommendations';
import { rebalanceBudget } from '@/lib/rebalanceBudget';
import {
  buildScenarioComparisonItems,
  getDefaultComparisonPresetIds,
  normalizeComparisonPresetIds,
  parseComparisonId,
} from '@/lib/scenarioComparison';
import { calculateDebtPayoffProjection } from '@/lib/debtPayoff';
import { initializeSpendingHistory } from '@/lib/spendingTrends';
import {
  saveBudgetInputs,
  loadBudgetInputs,
  loadNamedBudgets,
  loadBudgetInputsFromShareUrl,
  SHARE_PARAM_KEY,
} from '@/lib/storage';
import BudgetForm from '@/components/BudgetForm';
import BudgetDashboard from '@/components/BudgetDashboard';
import DashboardSkeleton from '@/components/DashboardSkeleton';
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
import FeedbackWidget from '@/components/FeedbackWidget';
import { trackAnalyticsEvent } from '@/lib/analytics';

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
const MOBILE_SWIPE_THRESHOLD_PX = 60;
const MOBILE_SWIPE_DIRECTION_RATIO = 1.25;
type ActiveTab = 'budget' | 'trends' | 'business_expenses';

interface UndoState {
  label: string;
  inputs: BudgetInputs;
  activePreset?: string;
  comparisonPresetIds: string[];
}

function cloneInputs(inputs: BudgetInputs): BudgetInputs {
  if (typeof structuredClone === 'function') {
    return structuredClone(inputs);
  }

  return JSON.parse(JSON.stringify(inputs)) as BudgetInputs;
}

export default function DynamicBudgetPage() {
  const [initialLoad] = useState(() => {
    const fromShareUrl =
      typeof window !== 'undefined' ? loadBudgetInputsFromShareUrl(window.location.href) : null;
    if (fromShareUrl) {
      return { sharedInputs: fromShareUrl, initialInputs: fromShareUrl };
    }

    const stored = loadBudgetInputs();
    if (stored) {
      return { sharedInputs: null, initialInputs: stored };
    }

    const defaults = { ...DEFAULT_INPUTS };
    if (!defaults.spendingHistory) {
      defaults.spendingHistory = initializeSpendingHistory();
    }
    return { sharedInputs: null, initialInputs: defaults };
  });
  const [inputs, setInputs] = useState<BudgetInputs>(initialLoad.initialInputs);
  const [savedBudgets, setSavedBudgets] = useState<NamedBudget[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadNamedBudgets();
  });
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
  const [activePreset, setActivePreset] = useState<string | undefined>('san_diego_baseline');
  const [showForm, setShowForm] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('budget');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printHeaderDate, setPrintHeaderDate] = useState<string | null>(null);
  const [comparisonPresetIds, setComparisonPresetIds] = useState<string[]>(
    () => getDefaultComparisonPresetIds('san_diego_baseline')
  );
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  // Track client-side hydration so we can show the skeleton during SSR/initial paint
  const [isMounted, setIsMounted] = useState(false);
  const previousSavingsFieldLocks = useRef<Record<string, boolean>>({});
  const printTriggered = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeCurrent = useRef<{ x: number; y: number } | null>(null);
  const printRestoreState = useRef<{
    activeTab: ActiveTab;
    showForm: boolean;
  } | null>(null);

  // ── Load from localStorage on mount ──────────────────────────────────────
  // (handled in useState initializer above)

  // ── Mark client-side mount (for skeleton → real UI transition) ───────────
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounting flag is the canonical SSR hydration guard
  useEffect(() => { setIsMounted(true); }, []);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !initialLoad.sharedInputs) return;
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has(SHARE_PARAM_KEY)) return;

    currentUrl.searchParams.delete(SHARE_PARAM_KEY);
    const query = currentUrl.searchParams.toString();
    const nextUrl = `${currentUrl.pathname}${query ? `?${query}` : ''}${currentUrl.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [initialLoad.sharedInputs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAfterPrint = () => {
      if (!printRestoreState.current) return;
      setActiveTab(printRestoreState.current.activeTab);
      setShowForm(printRestoreState.current.showForm);
      setIsPreparingPrint(false);
      window.setTimeout(() => setPrintHeaderDate(null), 0);
      printTriggered.current = false;
      printRestoreState.current = null;
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    const printWindow = globalThis.window;
    if (!isPreparingPrint || printTriggered.current || !printWindow) return;

    printTriggered.current = true;
    const timeoutId = printWindow.setTimeout(() => {
      printWindow.print();
    }, 0);

    return () => {
      printWindow.clearTimeout(timeoutId);
      printTriggered.current = false;
    };
  }, [isPreparingPrint]);

  // ── Derived calculations (memoized) ────────────────────────────────────────
  const breakdown = useMemo(() => calculateBudgetBreakdown(inputs), [inputs]);
  const healthScore = useMemo(() => calculateBudgetHealthScore(breakdown), [breakdown]);
  const recommendations = useMemo(
    () => generateRecommendations(inputs, breakdown),
    [inputs, breakdown]
  );
  const comparisonItems = useMemo(
    () => buildScenarioComparisonItems(inputs, comparisonPresetIds, activePreset, savedBudgets),
    [inputs, comparisonPresetIds, activePreset, savedBudgets]
  );
  const debtProjection = useMemo(
    () => calculateDebtPayoffProjection(inputs.debts, inputs.extraDebtPayoff, inputs.debtPayoffStrategy),
    [inputs.debts, inputs.extraDebtPayoff, inputs.debtPayoffStrategy]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const rememberUndoState = useCallback((label: string) => {
    setUndoState({
      label,
      inputs: cloneInputs(inputs),
      activePreset,
      comparisonPresetIds: [...comparisonPresetIds],
    });
    setActionMessage(label);
  }, [activePreset, comparisonPresetIds, inputs]);

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
    setComparisonPresetIds((prev) => normalizeComparisonPresetIds(prev, activePreset, savedBudgets));
  }, [activePreset, savedBudgets]);

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
    const presetName = presetId
      ? SCENARIO_PRESETS.find((item) => item.id === presetId)?.name ?? 'scenario'
      : 'scenario';
    rememberUndoState(`Loaded ${presetName}.`);
    setInputs(newInputs);
    setRebalanceResult(null);
    setActivePreset(presetId);
    trackAnalyticsEvent('preset_applied');
    setComparisonPresetIds((prev) => {
      const normalized = normalizeComparisonPresetIds(prev, presetId, savedBudgets);
      return normalized.length > 0 ? normalized : getDefaultComparisonPresetIds(presetId);
    });
  }, [rememberUndoState, savedBudgets]);

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
    trackAnalyticsEvent('rebalance_run');
  }, [inputs]);

  const handleReset = useCallback(() => {
    rememberUndoState('Reset to default budget.');
    setInputs(DEFAULT_INPUTS);
    setRebalanceResult(null);
    setActivePreset('san_diego_baseline');
    setComparisonPresetIds(getDefaultComparisonPresetIds('san_diego_baseline'));
  }, [rememberUndoState]);

  const handleImport = useCallback((newInputs: BudgetInputs) => {
    rememberUndoState('Imported budget from JSON.');
    setInputs(newInputs);
    setRebalanceResult(null);
    setActivePreset(undefined);
    setComparisonPresetIds((prev) => normalizeComparisonPresetIds(prev, undefined, savedBudgets));
  }, [rememberUndoState, savedBudgets]);

  const handleLoadNamedBudget = useCallback((budget: NamedBudget) => {
    rememberUndoState(`Loaded saved budget: ${budget.name}.`);
    setInputs(budget.inputs);
    setRebalanceResult(null);
    setActivePreset(undefined);
    trackAnalyticsEvent('saved_budget_loaded');
    setComparisonPresetIds((prev) => normalizeComparisonPresetIds(prev, undefined, savedBudgets));
  }, [rememberUndoState, savedBudgets]);

  const handleApplyComparisonScenario = useCallback((scenarioId: string) => {
    const parsed = parseComparisonId(scenarioId);
    if (!parsed) return;

    if (parsed.kind === 'preset') {
      const preset = SCENARIO_PRESETS.find((item) => item.id === parsed.id);
      if (!preset) return;
      handleApplyPreset(applyScenarioPreset(preset.inputs), preset.id);
      return;
    }

    const savedBudget = savedBudgets.find((budget) => budget.id === parsed.id);
    if (!savedBudget) return;
    handleLoadNamedBudget(savedBudget);
  }, [handleApplyPreset, handleLoadNamedBudget, savedBudgets]);

  const handleUndo = useCallback(() => {
    if (!undoState) return;
    setInputs(undoState.inputs);
    setActivePreset(undoState.activePreset);
    setComparisonPresetIds(undoState.comparisonPresetIds);
    setRebalanceResult(null);
    setActionMessage(`Undid: ${undoState.label}`);
    setUndoState(null);
  }, [undoState]);

  const handleExportPDF = useCallback(() => {
    if (typeof window === 'undefined') return;

    printRestoreState.current = { activeTab, showForm };
    const printDate = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    flushSync(() => {
      setActiveTab('budget');
      setShowForm(false);
      setPrintHeaderDate(printDate);
      setIsPreparingPrint(true);
    });
  }, [activeTab, showForm]);

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

  const isMobileViewport = useCallback(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }, []);

  const resetSwipeGesture = useCallback(() => {
    swipeStart.current = null;
    swipeCurrent.current = null;
  }, []);

  const handleWorkspaceTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!isMobileViewport() || event.touches.length !== 1) {
      resetSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    const position = { x: touch.clientX, y: touch.clientY };
    swipeStart.current = position;
    swipeCurrent.current = position;
  }, [isMobileViewport, resetSwipeGesture]);

  const handleWorkspaceTouchMove = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (!swipeStart.current) return;
    if (event.touches.length !== 1) {
      resetSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    swipeCurrent.current = { x: touch.clientX, y: touch.clientY };
  }, [resetSwipeGesture]);

  const handleWorkspaceTouchEnd = useCallback(() => {
    const start = swipeStart.current;
    const end = swipeCurrent.current;
    resetSwipeGesture();

    if (!start || !end || !isMobileViewport()) return;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    if (
      Math.abs(deltaX) < MOBILE_SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) < Math.abs(deltaY) * MOBILE_SWIPE_DIRECTION_RATIO
    ) {
      return;
    }

    if (deltaX < 0 && showForm) {
      setShowForm(false);
    } else if (deltaX > 0 && !showForm) {
      setShowForm(true);
    }
  }, [isMobileViewport, resetSwipeGesture, showForm]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900" data-print-root="true">
      {/* Skeleton shown before client-side hydration completes (E6-T8) */}
      {!isMounted && <DashboardSkeleton />}
      {/* Full app — hidden from DOM until mounted to prevent layout shift */}
      <div hidden={!isMounted}>
      {/* Header */}
      <header
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm"
        data-print-hidden="true"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">DynamicBudget</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dynamic Salary → Budget Planner</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MyBudgets
              currentInputs={inputs}
              budgets={savedBudgets}
              onBudgetsChange={setSavedBudgets}
              onLoad={handleLoadNamedBudget}
            />

            <ExportImport
              currentInputs={inputs}
              onImport={handleImport}
              onExportPDF={handleExportPDF}
            />

            <Link
              href="/learn"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all"
              onClick={() => trackAnalyticsEvent('learn_cta_clicked')}
            >
              📚 Learn
            </Link>

            <FeedbackWidget currentInputs={inputs} />

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
      <div
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm"
        data-print-hidden="true"
      >
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6" data-print-shell="true">
        <ErrorBoundary onReset={handleReset}>
          {actionMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
              data-print-hidden="true"
            >
              <p>{actionMessage}</p>
              <div className="flex items-center gap-2">
                {undoState && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:border-blue-400"
                  >
                    Undo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setActionMessage(null); setUndoState(null); }}
                  aria-label="Dismiss status message"
                  className="rounded-md px-2 py-1 text-blue-600 hover:bg-blue-100"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {activeTab === 'budget' ? (
            <div
              id="budget-panel"
              role="tabpanel"
              aria-labelledby="budget-tab"
              className="space-y-6"
              data-print-budget="true"
              onTouchStart={handleWorkspaceTouchStart}
              onTouchMove={handleWorkspaceTouchMove}
              onTouchEnd={handleWorkspaceTouchEnd}
              onTouchCancel={resetSwipeGesture}
              style={{ touchAction: 'pan-y' }}
            >
              <div data-print-hidden="true">
                <OnboardingCard />
              </div>
              <div data-print-hidden="true">
                <ScenarioComparison
                  items={comparisonItems}
                  savedBudgets={savedBudgets}
                  selectedScenarioIds={comparisonPresetIds}
                  activePresetId={activePreset}
                  onSelectionChange={(scenarioIds) =>
                    setComparisonPresetIds(normalizeComparisonPresetIds(scenarioIds, activePreset, savedBudgets))
                  }
                  onApplyScenario={handleApplyComparisonScenario}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <aside
                  className={`w-full md:w-96 md:shrink-0 ${showForm ? 'block' : 'hidden md:block'}`}
                  data-print-hidden="true"
                >
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

                <div
                  className={`flex-1 min-w-0 ${!showForm ? 'block' : 'hidden md:block'}`}
                  data-print-dashboard="true"
                >
                  {printHeaderDate ? (
                    <div data-print-header="true" data-print-only="true" className="hidden mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">DynamicBudget Summary</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Generated {printHeaderDate} · Client-side estimate for planning only
                      </p>
                    </div>
                  ) : null}
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
            <div
              id="trends-panel"
              role="tabpanel"
              aria-labelledby="trends-tab"
              className="flex flex-col md:flex-row gap-6"
              onTouchStart={handleWorkspaceTouchStart}
              onTouchMove={handleWorkspaceTouchMove}
              onTouchEnd={handleWorkspaceTouchEnd}
              onTouchCancel={resetSwipeGesture}
              style={{ touchAction: 'pan-y' }}
            >
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
      <footer
        className="mt-12 border-t border-gray-200 dark:border-gray-700 py-6 bg-white dark:bg-gray-800"
        data-print-hidden="true"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400 dark:text-gray-500">
          <p>DynamicBudget — Personal finance planning tool. All calculations are client-side estimates only.</p>
          <p className="mt-1">Tax figures are simplified estimates and should not be used for tax filing purposes.</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/learn"
              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              onClick={() => trackAnalyticsEvent('learn_cta_clicked')}
            >
              Learn budgeting concepts
            </Link>
            <span aria-hidden="true">•</span>
            <a
              href="https://github.com/bmhornback/DynamicBudget/issues/new/choose"
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Request a feature
            </a>
          </div>
        </div>
      </footer>
      </div>{/* end mounted wrapper */}
    </div>
  );
}

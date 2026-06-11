'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { BudgetInputs, RebalanceStrategy, SurplusAllocation, RebalanceResult } from '@/types/budget';
import { DEFAULT_INPUTS, SCENARIO_PRESETS, applyScenarioPreset } from '@/lib/defaultScenarios';
import { calculateBudgetBreakdown } from '@/lib/budgetCalculations';
import { calculateBudgetHealthScore } from '@/lib/budgetHealthScore';
import { generateRecommendations } from '@/lib/recommendations';
import { rebalanceBudget } from '@/lib/rebalanceBudget';
import BudgetForm from '@/components/BudgetForm';
import BudgetDashboard from '@/components/BudgetDashboard';
import ScenarioPresets from '@/components/ScenarioPresets';
import RebalanceControls from '@/components/RebalanceControls';

export default function MoveMathPage() {
  const [inputs, setInputs] = useState<BudgetInputs>(DEFAULT_INPUTS);
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
  const [activePreset, setActivePreset] = useState<string | undefined>('san_diego_baseline');
  const [showForm, setShowForm] = useState(true);

  // ── Derived calculations (memoized) ────────────────────────────────────────
  const breakdown = useMemo(() => calculateBudgetBreakdown(inputs), [inputs]);
  const healthScore = useMemo(() => calculateBudgetHealthScore(breakdown), [breakdown]);
  const recommendations = useMemo(
    () => generateRecommendations(inputs, breakdown),
    [inputs, breakdown]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = useCallback((updates: Partial<BudgetInputs>) => {
    setInputs((prev) => {
      const next = { ...prev, ...updates };
      if (prev.budgetMode === 'auto') {
        const result = rebalanceBudget(next, next.rebalanceStrategy, next.surplusAllocation);
        setRebalanceResult(result);
        return result.updatedInputs;
      }
      return next;
    });
    setActivePreset(undefined);
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
  }, []);

  const handleToggleMode = useCallback(() => {
    setInputs((prev) => ({
      ...prev,
      budgetMode: prev.budgetMode === 'auto' ? 'manual' : 'auto',
    }));
  }, []);

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
              className="px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:border-blue-300 transition-all md:hidden"
            >
              {showForm ? '📊 Dashboard' : '✏️ Edit'}
            </button>
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
              onApplyPreset={(newInputs) => {
                const matchId = SCENARIO_PRESETS.find(
                  (p) =>
                    p.inputs.annualSalary === newInputs.annualSalary &&
                    p.inputs.state === newInputs.state &&
                    p.inputs.rent === newInputs.rent
                )?.id;
                handleApplyPreset(newInputs, matchId);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left panel: Form */}
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

          {/* Right panel: Dashboard */}
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

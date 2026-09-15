'use client';

import React, { useState } from 'react';
import type { BudgetInputs, CustomPreset } from '@/types/budget';
import { SCENARIO_PRESETS, applyScenarioPreset } from '@/lib/defaultScenarios';
import {
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
} from '@/lib/storage';

interface ScenarioPresetsProps {
  onApplyPreset: (inputs: BudgetInputs, presetId: string) => void;
  currentPreset?: string;
  currentInputs: BudgetInputs;
}

export default function ScenarioPresets({ onApplyPreset, currentPreset, currentInputs }: ScenarioPresetsProps) {
  // Lazy initializer loads from localStorage once; avoids setState-in-effect lint error
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadCustomPresets();
  });
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSaveCustomPreset = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const scenarioInputs: Partial<BudgetInputs> = { ...currentInputs };
    delete scenarioInputs.spendingHistory;
    delete scenarioInputs.lockedFields;

    const preset: CustomPreset = {
      id: `custom_${crypto.randomUUID()}`,
      name: trimmed,
      description: 'Custom preset',
      inputs: scenarioInputs,
      createdAt: new Date().toISOString(),
    };
    saveCustomPreset(preset);
    setCustomPresets(loadCustomPresets());
    setNewName('');
    setSaving(false);
  };

  const handleDeleteCustomPreset = (id: string) => {
    deleteCustomPreset(id);
    setCustomPresets(loadCustomPresets());
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Built-in presets */}
      {SCENARIO_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onApplyPreset(applyScenarioPreset(preset.inputs), preset.id)}
          title={preset.description}
          aria-pressed={currentPreset === preset.id}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
            currentPreset === preset.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          {preset.name}
        </button>
      ))}

      {/* Custom presets */}
      {customPresets.map((preset) => (
        <span key={preset.id} className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onApplyPreset(applyScenarioPreset(preset.inputs), preset.id)}
            aria-pressed={currentPreset === preset.id}
            title={`Custom preset: ${preset.name}`}
            className={`px-3 py-1.5 rounded-l-full text-xs font-medium border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
              currentPreset === preset.id
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500'
            }`}
          >
            ⭐ {preset.name}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteCustomPreset(preset.id)}
            title={`Delete custom preset: ${preset.name}`}
            aria-label={`Delete preset ${preset.name}`}
            className={`px-1.5 py-1.5 rounded-r-full text-xs border border-l-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 ${
              currentPreset === preset.id
                ? 'bg-purple-700 text-white border-purple-600'
                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-400 dark:text-purple-500 border-purple-200 dark:border-purple-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700'
            }`}
          >
            ×
          </button>
        </span>
      ))}

      {/* Save as custom preset */}
      {saving ? (
        <span className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomPreset(); if (e.key === 'Escape') setSaving(false); }}
            placeholder="Preset name…"
            maxLength={40}
            autoFocus
            className="text-xs border border-purple-300 dark:border-purple-600 dark:bg-gray-800 dark:text-gray-100 rounded-full px-3 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            disabled={!newName.trim()}
            className="px-2 py-1.5 text-xs bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setSaving(false)}
            className="px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setSaving(true)}
          title="Save current budget as a custom preset"
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all"
        >
          + Save as Preset
        </button>
      )}
    </div>
  );
}


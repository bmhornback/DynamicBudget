'use client';

import React from 'react';
import type { BudgetInputs } from '@/types/budget';
import { SCENARIO_PRESETS, applyScenarioPreset } from '@/lib/defaultScenarios';

interface ScenarioPresetsProps {
  onApplyPreset: (inputs: BudgetInputs) => void;
  currentPreset?: string;
}

export default function ScenarioPresets({ onApplyPreset, currentPreset }: ScenarioPresetsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIO_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onApplyPreset(applyScenarioPreset(preset.inputs))}
          title={preset.description}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            currentPreset === preset.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}

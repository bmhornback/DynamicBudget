'use client';

import React from 'react';
import { formatCurrency } from '@/lib/formatters';

interface BudgetFieldInputProps {
  id: string;
  label: string;
  value: number;
  isLocked: boolean;
  onChange: (value: number) => void;
  onToggleLock: (id: string) => void;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  disabled?: boolean;
}

export default function BudgetFieldInput({
  id,
  label,
  value,
  isLocked,
  onChange,
  onToggleLock,
  min = 0,
  max,
  prefix = '$',
  suffix,
  description,
  disabled = false,
}: BudgetFieldInputProps) {
  const [raw, setRaw] = React.useState(value.toString());
  const [focused, setFocused] = React.useState(false);

  // Keep raw in sync when value changes from outside (e.g., rebalance)
  React.useEffect(() => {
    if (!focused) {
      setRaw(value.toString());
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      const clamped = max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed);
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(raw);
    const finalValue = isNaN(parsed) ? 0 : Math.max(min, max !== undefined ? Math.min(max, parsed) : parsed);
    setRaw(finalValue.toString());
    onChange(finalValue);
  };

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
      isLocked ? 'bg-slate-50 border border-slate-200' : 'bg-white border border-gray-100 hover:border-gray-200'
    }`}>
      {/* Lock button */}
      <button
        type="button"
        onClick={() => onToggleLock(id)}
        title={isLocked ? 'Unlock field' : 'Lock field'}
        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
          isLocked
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
        disabled={disabled}
      >
        {isLocked ? '🔒' : '🔓'}
      </button>

      {/* Label */}
      <label
        htmlFor={id}
        className={`flex-1 text-sm ${isLocked ? 'text-slate-600 font-medium' : 'text-gray-700'} cursor-pointer min-w-0`}
        title={description}
      >
        {label}
        {description && (
          <span className="block text-xs text-gray-400 truncate">{description}</span>
        )}
      </label>

      {/* Input */}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2 text-gray-500 text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          id={id}
          type="number"
          value={focused ? raw : value}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setRaw(value.toString()); }}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          step="1"
          className={`w-28 text-right text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            prefix ? 'pl-6' : ''
          } ${suffix ? 'pr-8' : ''} ${
            isLocked
              ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-default'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
          readOnly={isLocked}
        />
        {suffix && (
          <span className="absolute right-2 text-gray-400 text-xs pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

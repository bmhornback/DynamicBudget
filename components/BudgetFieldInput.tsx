'use client';

import React from 'react';

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
  /** Optional validation: returns a warning message or null */
  validate?: (value: number) => string | null;
  baseCadence?: 'monthly' | 'annual' | 'daily';
  displayCadence?: 'monthly' | 'annual' | 'daily';
  termDefinition?: string;
  showCadenceHint?: boolean;
  allowCadenceConversion?: boolean;
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
  validate,
  baseCadence = 'monthly',
  displayCadence = 'monthly',
  termDefinition,
  showCadenceHint = true,
  allowCadenceConversion = true,
}: BudgetFieldInputProps) {
  const [raw, setRaw] = React.useState(value.toString());
  const [focused, setFocused] = React.useState(false);
  const [prevValue, setPrevValue] = React.useState(value);
  const [showDefinition, setShowDefinition] = React.useState(false);
  const descriptionId = description ? `${id}-description` : undefined;
  const validationId = validationMessageId(id);
  const definitionId = termDefinition ? `${id}-definition` : undefined;

  // Keep raw in sync when value changes from outside (e.g., rebalance)
  if (!focused && prevValue !== value) {
    setPrevValue(value);
    setRaw(value.toString());
  }

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

  // Format the display value with locale-aware thousands separators when not focused
  const displayValue = focused
    ? raw
    : value % 1 === 0
      ? value.toLocaleString('en-US')
      : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const validationMessage = validate ? validate(value) : null;
  const describedBy = [descriptionId, validationMessage ? validationId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
  const cadenceHint = showCadenceHint && allowCadenceConversion
    ? getCadenceHint(value, baseCadence, displayCadence)
    : null;

  return (
    <div className={`flex flex-col rounded-lg transition-colors ${
      isLocked ? 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
    }`}>
      <div className="flex items-center gap-2 py-2 px-3">
        {/* Lock button */}
        <button
          type="button"
          onClick={() => onToggleLock(id)}
          title={isLocked ? 'Unlock field' : 'Lock field'}
          aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${label}`}
          aria-pressed={isLocked}
          aria-controls={id}
          className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
            isLocked
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          disabled={disabled}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="relative flex items-center gap-1">
            <label
              htmlFor={id}
              className={`text-sm ${isLocked ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-gray-700 dark:text-gray-300'} cursor-pointer min-w-0`}
              title={description}
            >
              {label}
            </label>
            {termDefinition && (
              <>
                <button
                  type="button"
                  aria-label={`${label} definition: ${termDefinition}`}
                  aria-expanded={showDefinition}
                  aria-controls={definitionId}
                  onFocus={() => setShowDefinition(true)}
                  onBlur={() => setShowDefinition(false)}
                  onMouseEnter={() => setShowDefinition(true)}
                  onMouseLeave={() => setShowDefinition(false)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-[10px] font-bold text-blue-700 dark:text-blue-300"
                >
                  ?
                </button>
                {showDefinition && (
                  <span id={definitionId} role="tooltip" className="absolute z-10 mt-1 rounded bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
                    {termDefinition}
                  </span>
                )}
              </>
            )}
          </div>
          {description && (
            <span
              id={descriptionId}
              className="block text-xs text-gray-400 dark:text-gray-500 truncate"
            >
              {description}
            </span>
          )}
          {cadenceHint && (
            <span className="block text-xs text-blue-600 dark:text-blue-300">
              {cadenceHint}
            </span>
          )}
        </div>

        {/* Input */}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none">{prefix}</span>
          )}
          <input
            id={id}
            type={focused ? 'number' : 'text'}
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={() => { setFocused(true); setRaw(value.toString()); }}
            onBlur={handleBlur}
            disabled={disabled}
            min={focused ? min : undefined}
            max={focused ? max : undefined}
            step={focused ? 'any' : undefined}
            aria-describedby={describedBy}
            className={`w-28 text-right text-sm rounded-md border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              prefix ? 'pl-6' : ''
            } ${suffix ? 'pr-8' : ''} ${
              isLocked
                ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-default'
                : validationMessage
                  ? 'bg-white dark:bg-gray-800 border-amber-400 dark:border-amber-500 text-gray-900 dark:text-gray-100'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
            }`}
            readOnly={isLocked}
          />
          {suffix && (
            <span className="absolute right-2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">{suffix}</span>
          )}
        </div>
      </div>
      {/* Inline validation warning */}
      {validationMessage && (
        <div className="px-3 pb-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <span aria-hidden="true">⚠️</span>
          <span id={validationId} role="alert">{validationMessage}</span>
        </div>
      )}
    </div>
  );
}

function validationMessageId(id: string) {
  return `${id}-validation`;
}

export function getCadenceLabel(cadence: 'monthly' | 'annual' | 'daily') {
  return cadence === 'annual' ? 'year' : cadence === 'monthly' ? 'month' : 'day';
}

export function getCadenceHint(
  value: number,
  baseCadence: 'monthly' | 'annual' | 'daily',
  displayCadence: 'monthly' | 'annual' | 'daily',
  alwaysShow = false
) {
  if (baseCadence === displayCadence) return null;
  if ((!Number.isFinite(value) || value === 0) && !alwaysShow) return null;

  const annual = toAnnual(value, baseCadence);
  const converted = fromAnnual(annual, displayCadence);
  const cadenceLabel = getCadenceLabel(displayCadence);
  return `≈ ${converted.toLocaleString('en-US', { maximumFractionDigits: 2 })} per ${cadenceLabel}`;
}

function toAnnual(value: number, cadence: 'monthly' | 'annual' | 'daily') {
  if (cadence === 'annual') return value;
  if (cadence === 'monthly') return value * 12;
  return value * 365;
}

function fromAnnual(annualValue: number, cadence: 'monthly' | 'annual' | 'daily') {
  if (cadence === 'annual') return annualValue;
  if (cadence === 'monthly') return annualValue / 12;
  return annualValue / 365;
}

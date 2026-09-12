'use client';

import React from 'react';
import type { BudgetInputs, CarSituation, DebtAccount, FilingStatus, StateOfResidence, HousingMode } from '@/types/budget';
import { DEFAULT_INPUTS } from '@/lib/defaultScenarios';
import BudgetSection from './BudgetSection';
import BudgetFieldInput from './BudgetFieldInput';
import { STATE_LABELS } from '@/lib/taxCalculations';

interface BudgetFormProps {
  inputs: BudgetInputs;
  onChange: (updates: Partial<BudgetInputs>) => void;
  onToggleLock: (fieldId: string) => void;
}

const STATE_OPTIONS: Array<{ value: StateOfResidence; label: string }> = (
  Object.entries(STATE_LABELS) as Array<[StateOfResidence, string]>
).map(([value, label]) => ({ value, label }));

const FILING_STATUS_OPTIONS: Array<{ value: FilingStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'head_of_household', label: 'Head of Household' },
];

const CAR_SITUATION_OPTIONS: Array<{ value: CarSituation; label: string }> = [
  { value: 'owned_outright', label: 'Own car outright' },
  { value: 'car_loan', label: 'Car loan' },
  { value: 'car_lease', label: 'Car lease' },
  { value: 'no_car', label: 'No car' },
];

const HOUSING_MODE_OPTIONS: Array<{ value: HousingMode; label: string }> = [
  { value: 'renter', label: 'Renter' },
  { value: 'homeowner', label: 'Homeowner' },
];

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200">
      <label className="flex-1 text-sm text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-gray-200"
      onClick={() => onChange(!value)}
    >
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="py-2 px-3 bg-white border border-gray-100 rounded-lg">
      <div className="flex justify-between mb-1">
        <label className="text-sm text-gray-700">{label}</label>
        <span className="text-sm font-medium text-gray-900">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

export default function BudgetForm({ inputs, onChange, onToggleLock }: BudgetFormProps) {
  const savingsPercentOfNetIncome = Number.isFinite(inputs.savingsPercentOfNetIncome)
    ? inputs.savingsPercentOfNetIncome
    : DEFAULT_INPUTS.savingsPercentOfNetIncome;

  const field = (id: keyof BudgetInputs, label: string, description?: string) => (
    <BudgetFieldInput
      key={id}
      id={id}
      label={label}
      value={inputs[id] as number}
      isLocked={inputs.lockedFields[id] === true}
      onChange={(v) => onChange({ [id]: v })}
      onToggleLock={onToggleLock}
      description={description}
    />
  );

  const hasCarPayment =
    inputs.carSituation === 'car_loan' || inputs.carSituation === 'car_lease';

  const updateDebt = (id: string, updates: Partial<DebtAccount>) => {
    onChange({
      debts: inputs.debts.map((debt) =>
        debt.id === id ? { ...debt, ...updates } : debt
      ),
    });
  };

  const removeDebt = (id: string) => {
    onChange({ debts: inputs.debts.filter((debt) => debt.id !== id) });
  };

  const addDebt = () => {
    onChange({
      debts: [
        ...inputs.debts,
        {
          id: crypto.randomUUID(),
          name: `Debt ${inputs.debts.length + 1}`,
          balance: 0,
          interestRate: 0,
          minimumPayment: 0,
        },
      ],
    });
  };

  const validatePrimaryHousingPayment = (v: number) => {
    const grossMonthly = inputs.annualSalary / 12;
    if (grossMonthly <= 0) return null;
    return v > grossMonthly * 0.5
      ? `Housing payment is ${Math.round((v / grossMonthly) * 100)}% of gross monthly income — typically recommended under 30%`
      : null;
  };

  return (
    <div className="space-y-2">

      {/* ── Income & Tax ─────────────────────────────────────────────── */}
      <BudgetSection title="Income & Taxes" icon="💰">
        <div className="py-2 px-3 bg-white border border-gray-100 rounded-lg">
          <label className="text-sm text-gray-700 block mb-1">Annual Gross Salary</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={inputs.annualSalary}
              onChange={(e) => onChange({ annualSalary: Math.max(0, Number(e.target.value)) })}
              className="w-full pl-7 pr-4 py-2 text-lg font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              step="1000"
              min="0"
            />
          </div>
        </div>

        <SelectField
          label="State of Residence"
          value={inputs.state}
          options={STATE_OPTIONS}
          onChange={(v) => onChange({ state: v as StateOfResidence })}
        />

        <SelectField
          label="Filing Status"
          value={inputs.filingStatus}
          options={FILING_STATUS_OPTIONS}
          onChange={(v) => onChange({ filingStatus: v as FilingStatus })}
        />

        <ToggleField
          label="Max Out 401(k)"
          value={inputs.maxOut401k}
          onChange={(v) => onChange({ maxOut401k: v })}
          description="Cap at $24,500/year employee contribution"
        />

        {!inputs.maxOut401k && (
          <NumberSlider
            label="Retirement Contribution %"
            value={inputs.retirementContributionPercent}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => onChange({ retirementContributionPercent: v })}
            suffix="%"
          />
        )}

        <ToggleField
          label="Roth 401(k)"
          value={inputs.is401kRoth}
          onChange={(v) => onChange({ is401kRoth: v })}
          description="After-tax contributions; no tax deduction now, tax-free in retirement"
        />

        {field('employerMatchPercent', 'Employer Match %')}

        <NumberSlider
          label="Employer Match Cap %"
          value={inputs.employerMatchCapPercent}
          min={0}
          max={100}
          step={1}
          onChange={(v) => onChange({ employerMatchCapPercent: v })}
          suffix="%"
        />

        <NumberSlider
          label={`Age (for catch-up contribution eligibility)${inputs.userAge >= 50 ? ' ✓ Eligible for $7,500 401k + $1,000 IRA catch-up' : ''}`}
          value={inputs.userAge}
          min={0}
          max={100}
          step={1}
          onChange={(v) => onChange({ userAge: v })}
        />

        {field('bonusIncome', 'Annual Bonus Income')}
        {field('otherMonthlyIncome', 'Other Monthly Income')}
        {field('iraContribution', 'Monthly IRA Contribution', inputs.userAge >= 50 ? 'Capped at $8,000/year' : 'Capped at $7,000/year')}
      </BudgetSection>

      {/* ── Housing ──────────────────────────────────────────────────── */}
      <BudgetSection title="Housing" icon="🏠">
        <SelectField
          label="Housing Mode"
          value={inputs.housingMode}
          options={HOUSING_MODE_OPTIONS}
          onChange={(v) => onChange({ housingMode: v })}
        />
        {inputs.housingMode === 'homeowner' ? (
          <>
            <BudgetFieldInput
              id="mortgagePayment"
              label="Monthly Mortgage Payment"
              value={inputs.mortgagePayment}
              isLocked={inputs.lockedFields['mortgagePayment'] === true}
              onChange={(v) => onChange({ mortgagePayment: v })}
              onToggleLock={onToggleLock}
              validate={validatePrimaryHousingPayment}
            />
            {field('propertyTax', 'Property Tax')}
            {field('homeInsurance', 'Home Insurance')}
            {field('homeMaintenanceReserve', 'Maintenance Reserve')}
          </>
        ) : (
          <>
            <BudgetFieldInput
              id="rent"
              label="Monthly Rent"
              value={inputs.rent}
              isLocked={inputs.lockedFields['rent'] === true}
              onChange={(v) => onChange({ rent: v })}
              onToggleLock={onToggleLock}
              validate={validatePrimaryHousingPayment}
            />
            {field('petRent', 'Pet Rent')}
            {field('rentersInsurance', 'Renters Insurance')}
          </>
        )}
        {field('parkingFee', 'Parking Fee')}
        {field('hoaFee', 'HOA Fee')}
      </BudgetSection>

      {/* ── Utilities ────────────────────────────────────────────────── */}
      <BudgetSection title="Utilities" icon="⚡" defaultOpen={false}>
        {field('electric', 'Electric')}
        {field('gas', 'Gas')}
        {field('water', 'Water')}
        {field('trash', 'Trash')}
        {field('internet', 'Internet')}
        {field('phone', 'Phone')}
      </BudgetSection>

      {/* ── Transportation ───────────────────────────────────────────── */}
      <BudgetSection title="Transportation" icon="🚗">
        <SelectField
          label="Car Situation"
          value={inputs.carSituation}
          options={CAR_SITUATION_OPTIONS}
          onChange={(v) => {
            const newSituation = v as CarSituation;
            onChange({
              carSituation: newSituation,
              carPayment: newSituation === 'owned_outright' || newSituation === 'no_car' ? 0 : inputs.carPayment,
            });
          }}
        />
        {hasCarPayment && field('carPayment', inputs.carSituation === 'car_lease' ? 'Monthly Lease Payment' : 'Monthly Car Payment')}
        {inputs.carSituation !== 'no_car' && (
          <>
            {field('fuel', 'Fuel')}
            {field('carInsurance', 'Car Insurance')}
            {field('carMaintenance', 'Maintenance / Registration Sinking Fund')}
            {field('carParking', 'Parking')}
            {field('tolls', 'Tolls')}
          </>
        )}
        {field('rideShareTransit', 'Rideshare / Public Transit')}
      </BudgetSection>

      {/* ── Pets ─────────────────────────────────────────────────────── */}
      <BudgetSection title="Pets" icon="🐾">
        <ToggleField
          label="Pet Owner"
          value={inputs.petsEnabled}
          onChange={(v) => onChange({ petsEnabled: v })}
          description="Enable pet expense tracking"
        />
        {inputs.petsEnabled && (
          <>
            <div className="py-2 px-3 bg-white border border-gray-100 rounded-lg">
              <label className="text-sm text-gray-700 block mb-1">Number of Pets</label>
              <input
                type="number"
                value={inputs.numberOfPets}
                onChange={(e) => onChange({ numberOfPets: Math.max(0, Number(e.target.value)) })}
                className="w-20 text-center border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                min="0"
                max="10"
              />
            </div>
            {field('petFood', 'Pet Food')}
            {field('vetMedications', 'Vet / Shots / Medications')}
            {field('petInsurance', 'Pet Insurance')}
            {field('groomingSupplies', 'Grooming / Supplies / Toys')}
            {field('dogDaycare', 'Dog Daycare')}
            {field('boardingSitter', 'Boarding / Sitter Sinking Fund')}
            {field('emergencyPetFund', 'Emergency Pet Fund')}
          </>
        )}
      </BudgetSection>

      {/* ── Groceries & Household ────────────────────────────────────── */}
      <BudgetSection title="Groceries & Household" icon="🛒">
        {field('groceries', 'Groceries')}
        {field('householdBasics', 'Household Basics')}
        {field('diningOut', 'Dining Out')}
      </BudgetSection>

      {/* ── Health ───────────────────────────────────────────────────── */}
      <BudgetSection title="Health & Medical" icon="🏥" defaultOpen={false}>
        {field('healthInsurance', 'Health Insurance / Medical')}
        {field('prescriptions', 'Prescriptions')}
        {field('gymFitness', 'Gym / Fitness')}
        {field('therapyWellness', 'Therapy / Wellness')}
      </BudgetSection>

      {/* ── Savings & Investing ──────────────────────────────────────── */}
      <BudgetSection title="Savings & Investing" icon="📈">
        <ToggleField
          label="Use Percentage-Based Savings"
          value={inputs.isSavingsByPercentage}
          onChange={(v) => onChange({ isSavingsByPercentage: v })}
          description="Save a percentage of net income instead of fixed amounts"
        />
        {inputs.isSavingsByPercentage && (
          <NumberSlider
            label="Save % of Net Income"
            value={savingsPercentOfNetIncome}
            min={0}
            max={50}
            step={1}
            onChange={(v) => onChange({ savingsPercentOfNetIncome: v })}
            suffix="%"
          />
        )}
        {!inputs.isSavingsByPercentage && (
          <>
            {field('emergencyFundContribution', 'Emergency Fund Monthly Contribution')}
            {field('emergencyFundTarget', 'Emergency Fund Target', '0 = auto-calculate (6 months)')}
            {field(
              'houseDownPaymentContribution',
              inputs.housingMode === 'homeowner'
                ? 'Home Equity Monthly Contribution'
                : 'House Down Payment Monthly'
            )}
            {field(
              'houseDownPaymentTarget',
              inputs.housingMode === 'homeowner'
                ? 'Home Equity Target'
                : 'Down Payment Target'
            )}
            {field('taxableInvestments', 'Taxable Investments')}
            {field('extraDebtPayoff', 'Extra Debt Payoff')}
            {field('generalCashSavings', 'General Cash Savings')}
          </>
        )}
      </BudgetSection>

      {/* ── Lifestyle ────────────────────────────────────────────────── */}
      <BudgetSection title="Lifestyle" icon="🎉" defaultOpen={false}>
        {field('funEntertainment', 'Fun / Entertainment')}
        {field('travel', 'Travel')}
        {field('clothes', 'Clothes')}
        {field('subscriptions', 'Subscriptions')}
        {field('personalSpending', 'Personal Spending')}
        {field('gifts', 'Gifts')}
        {field('miscBuffer', 'Miscellaneous Buffer')}
      </BudgetSection>

      {/* ── Debt Accounts ─────────────────────────────────────────────── */}
      <BudgetSection title="Debt Accounts" icon="💳" defaultOpen={false}>
        <div className="py-2 px-3 bg-white border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-700">Track balances to project payoff timing</p>
            <button
              type="button"
              onClick={addDebt}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              + Add Debt
            </button>
          </div>
        </div>

        {inputs.debts.length === 0 ? (
          <p className="text-xs text-gray-500 px-2">No debt accounts yet.</p>
        ) : (
          inputs.debts.map((debt) => (
            <div key={debt.id} className="py-2 px-3 bg-white border border-gray-100 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`debt-name-${debt.id}`} className="text-sm text-gray-700">Debt Name</label>
                <button
                  type="button"
                  onClick={() => removeDebt(debt.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <input
                id={`debt-name-${debt.id}`}
                type="text"
                value={debt.name}
                onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor={`debt-balance-${debt.id}`} className="text-xs text-gray-500 block mb-1">Balance</label>
                  <input
                    id={`debt-balance-${debt.id}`}
                    type="number"
                    min="0"
                    step="100"
                    value={debt.balance}
                    onChange={(e) =>
                      updateDebt(debt.id, { balance: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor={`debt-apr-${debt.id}`} className="text-xs text-gray-500 block mb-1">APR %</label>
                  <input
                    id={`debt-apr-${debt.id}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={debt.interestRate}
                    onChange={(e) =>
                      updateDebt(debt.id, { interestRate: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label htmlFor={`debt-min-${debt.id}`} className="text-xs text-gray-500 block mb-1">Min Payment</label>
                  <input
                    id={`debt-min-${debt.id}`}
                    type="number"
                    min="0"
                    step="10"
                    value={debt.minimumPayment}
                    onChange={(e) =>
                      updateDebt(debt.id, { minimumPayment: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </BudgetSection>

    </div>
  );
}

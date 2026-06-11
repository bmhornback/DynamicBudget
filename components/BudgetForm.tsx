'use client';

import React from 'react';
import type { BudgetInputs, CarSituation, FilingStatus, StateOfResidence } from '@/types/budget';
import BudgetSection from './BudgetSection';
import BudgetFieldInput from './BudgetFieldInput';
import { STATE_LABELS } from '@/lib/taxCalculations';

interface BudgetFormProps {
  inputs: BudgetInputs;
  onChange: (updates: Partial<BudgetInputs>) => void;
  onToggleLock: (fieldId: string) => void;
}

const STATE_OPTIONS: Array<{ value: StateOfResidence; label: string }> = [
  { value: 'CA', label: 'California' },
  { value: 'GA', label: 'Georgia' },
  { value: 'no_state_tax', label: 'No State Income Tax' },
];

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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200">
      <label className="flex-1 text-sm text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

        {field('employerMatchPercent', 'Employer Match %')}
        {field('bonusIncome', 'Annual Bonus Income')}
        {field('otherMonthlyIncome', 'Other Monthly Income')}
        {field('iraContribution', 'Monthly IRA Contribution', 'Capped at $7,500/year')}
      </BudgetSection>

      {/* ── Housing ──────────────────────────────────────────────────── */}
      <BudgetSection title="Housing" icon="🏠">
        {field('rent', 'Monthly Rent')}
        {field('petRent', 'Pet Rent')}
        {field('rentersInsurance', 'Renters Insurance')}
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
        {field('emergencyFundContribution', 'Emergency Fund Monthly Contribution')}
        {field('emergencyFundTarget', 'Emergency Fund Target', '0 = auto-calculate (6 months)')}
        {field('houseDownPaymentContribution', 'House Down Payment Monthly')}
        {field('houseDownPaymentTarget', 'Down Payment Target')}
        {field('taxableInvestments', 'Taxable Investments')}
        {field('extraDebtPayoff', 'Extra Debt Payoff')}
        {field('generalCashSavings', 'General Cash Savings')}
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

    </div>
  );
}

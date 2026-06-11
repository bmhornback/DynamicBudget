'use client';

import React from 'react';
import type { BudgetBreakdown, BudgetInputs, BudgetHealthScore as BudgetHealthScoreType, Recommendation, RebalanceResult } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import IncomeSummary from './IncomeSummary';
import ExpenseSummary from './ExpenseSummary';
import SavingsSummary from './SavingsSummary';
import BudgetHealthScore from './BudgetHealthScore';
import RecommendationList from './RecommendationList';
import BudgetCard from './BudgetCard';

interface BudgetDashboardProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
  healthScore: BudgetHealthScoreType;
  recommendations: Recommendation[];
  rebalanceResult: RebalanceResult | null;
}

export default function BudgetDashboard({
  breakdown,
  inputs,
  healthScore,
  recommendations,
  rebalanceResult,
}: BudgetDashboardProps) {
  const { isOverBudget, deficit, surplus, remainingMonthlyBuffer, netMonthlyIncome } = breakdown;

  // Buffer status banner
  const bufferBanner = isOverBudget ? (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <span className="text-2xl">🚨</span>
      <div>
        <p className="font-bold text-red-800">Over Budget by {formatCurrency(deficit)}/month</p>
        <p className="text-sm text-red-600">Use Auto Balance to bring the budget in line.</p>
      </div>
    </div>
  ) : remainingMonthlyBuffer < 250 ? (
    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="font-bold text-amber-800">Thin Buffer: {formatCurrency(remainingMonthlyBuffer)}/month</p>
        <p className="text-sm text-amber-600">Consider reducing some expenses for more breathing room.</p>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
      <span className="text-2xl">✅</span>
      <div>
        <p className="font-bold text-green-800">Surplus: {formatCurrency(surplus)}/month</p>
        <p className="text-sm text-green-600">Budget is balanced! Consider allocating the surplus.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Status banner */}
      {bufferBanner}

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill
          label="Take-Home"
          value={formatCurrency(netMonthlyIncome)}
          sub="per month"
          color="blue"
        />
        <StatPill
          label="Total Spending"
          value={formatCurrency(breakdown.totalAllocated)}
          sub="per month"
          color={isOverBudget ? 'red' : 'gray'}
        />
        <StatPill
          label="Savings Rate"
          value={formatPercent(breakdown.savingsRateGross)}
          sub="of gross income"
          color={breakdown.savingsRateGross >= 0.15 ? 'green' : 'amber'}
        />
        <StatPill
          label="Health Score"
          value={`${healthScore.score}`}
          sub={healthScore.label}
          color={
            healthScore.score >= 75 ? 'green' : healthScore.score >= 60 ? 'amber' : 'red'
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IncomeSummary breakdown={breakdown} />
        <SavingsSummary breakdown={breakdown} />
        <ExpenseSummary breakdown={breakdown} inputs={inputs} />
        <BudgetHealthScore healthScore={healthScore} />
      </div>

      {/* Detailed sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CoreExpensesDetail breakdown={breakdown} inputs={inputs} />
        <TransportationDetail breakdown={breakdown} inputs={inputs} />
        {inputs.petsEnabled && <PetsDetail inputs={inputs} breakdown={breakdown} />}
        <SavingsDetail breakdown={breakdown} inputs={inputs} />
      </div>

      {/* Recommendations */}
      <RecommendationList recommendations={recommendations} />
    </div>
  );
}

function StatPill({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'gray';
}) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    gray: 'bg-gray-50 border-gray-100 text-gray-700',
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums text-gray-800">{value}</span>
        {sub && <span className="block text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

function DividerLine() {
  return <div className="h-px bg-gray-100 my-1" />;
}

function CoreExpensesDetail({ breakdown, inputs }: { breakdown: BudgetBreakdown; inputs: BudgetInputs }) {
  return (
    <BudgetCard title="Core Living Expenses">
      <DetailRow label="Rent" value={formatCurrency(inputs.rent)} sub={`${formatPercent(breakdown.rentAsPercentGross)} of gross`} />
      <DetailRow label="Utilities" value={formatCurrency(breakdown.totalUtilities - inputs.phone)} />
      <DetailRow label="Phone" value={formatCurrency(inputs.phone)} />
      <DetailRow label="Groceries" value={formatCurrency(inputs.groceries)} />
      <DetailRow label="Household Basics" value={formatCurrency(inputs.householdBasics)} />
      <DetailRow label="Dining Out" value={formatCurrency(inputs.diningOut)} />
      <DividerLine />
      <DetailRow label="Health Insurance" value={formatCurrency(inputs.healthInsurance)} />
      <DetailRow label="Prescriptions" value={formatCurrency(inputs.prescriptions)} />
      <DetailRow label="Gym / Fitness" value={formatCurrency(inputs.gymFitness)} />
    </BudgetCard>
  );
}

function TransportationDetail({ breakdown, inputs }: { breakdown: BudgetBreakdown; inputs: BudgetInputs }) {
  const carLabel =
    inputs.carSituation === 'car_loan'
      ? 'Car Loan Payment'
      : inputs.carSituation === 'car_lease'
      ? 'Lease Payment'
      : inputs.carSituation === 'no_car'
      ? 'No Car'
      : 'Owned Outright';

  return (
    <BudgetCard title="Transportation">
      <DetailRow label="Car Status" value={carLabel} />
      {inputs.carPayment > 0 && <DetailRow label="Monthly Payment" value={formatCurrency(inputs.carPayment)} />}
      <DetailRow label="Fuel" value={formatCurrency(inputs.fuel)} />
      <DetailRow label="Car Insurance" value={formatCurrency(inputs.carInsurance)} />
      <DetailRow label="Maintenance / Registration" value={formatCurrency(inputs.carMaintenance)} />
      <DetailRow label="Parking" value={formatCurrency(inputs.carParking)} />
      <DetailRow label="Tolls" value={formatCurrency(inputs.tolls)} />
      <DetailRow label="Rideshare / Transit" value={formatCurrency(inputs.rideShareTransit)} />
      <DividerLine />
      <DetailRow
        label="Total Transportation"
        value={formatCurrency(breakdown.totalTransportation)}
        sub={`${formatPercent(breakdown.carCostsAsPercentTakeHome)} of take-home`}
      />
    </BudgetCard>
  );
}

function PetsDetail({ inputs, breakdown }: { inputs: BudgetInputs; breakdown: BudgetBreakdown }) {
  return (
    <BudgetCard title="Pet Costs">
      <DetailRow label="Pet Rent" value={formatCurrency(inputs.petRent)} />
      <DetailRow label="Pet Food" value={formatCurrency(inputs.petFood)} />
      <DetailRow label="Vet / Medications" value={formatCurrency(inputs.vetMedications)} />
      <DetailRow label="Pet Insurance" value={formatCurrency(inputs.petInsurance)} />
      <DetailRow label="Grooming / Supplies" value={formatCurrency(inputs.groomingSupplies)} />
      <DetailRow label="Dog Daycare" value={formatCurrency(inputs.dogDaycare)} />
      <DetailRow label="Boarding / Sitter" value={formatCurrency(inputs.boardingSitter)} />
      <DetailRow label="Emergency Pet Fund" value={formatCurrency(inputs.emergencyPetFund)} />
      <DividerLine />
      <DetailRow
        label="Total Pet Costs"
        value={formatCurrency(breakdown.totalPets)}
        sub={`${formatPercent(breakdown.petCostsAsPercentTakeHome)} of take-home`}
      />
    </BudgetCard>
  );
}

function SavingsDetail({ breakdown, inputs }: { breakdown: BudgetBreakdown; inputs: BudgetInputs }) {
  const efTarget =
    inputs.emergencyFundTarget > 0
      ? inputs.emergencyFundTarget
      : breakdown.emergencyFundTargetCalculated;

  return (
    <BudgetCard title="Savings Detail">
      <DetailRow
        label="Emergency Fund Contribution"
        value={formatCurrency(inputs.emergencyFundContribution)}
      />
      <DetailRow
        label="Emergency Fund Target (6 mo)"
        value={formatCurrency(efTarget)}
      />
      <DividerLine />
      <DetailRow
        label="House Fund Monthly"
        value={formatCurrency(inputs.houseDownPaymentContribution)}
        sub={`${formatCurrency(breakdown.annualHouseFund)}/year`}
      />
      <DetailRow
        label="Down Payment Target"
        value={formatCurrency(inputs.houseDownPaymentTarget)}
        sub={
          inputs.houseDownPaymentContribution > 0
            ? `~${Math.ceil(inputs.houseDownPaymentTarget / inputs.houseDownPaymentContribution)} months to goal`
            : undefined
        }
      />
      <DividerLine />
      <DetailRow
        label="Taxable Investments"
        value={formatCurrency(inputs.taxableInvestments)}
        sub={`${formatCurrency(breakdown.annualTaxableInvestments)}/year`}
      />
      <DetailRow label="Debt Payoff" value={formatCurrency(inputs.extraDebtPayoff)} />
      <DetailRow label="General Cash Savings" value={formatCurrency(inputs.generalCashSavings)} />
      <DividerLine />
      <DetailRow
        label="Total Annual Savings"
        value={formatCurrency(breakdown.totalAnnualSavingsIncludingRetirement)}
        sub={`${formatPercent(breakdown.savingsRateGross)} of gross income`}
      />
    </BudgetCard>
  );
}

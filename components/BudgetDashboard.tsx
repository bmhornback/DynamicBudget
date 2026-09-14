'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  BudgetBreakdown,
  BudgetInputs,
  DebtPayoffStrategy,
  BudgetHealthScore as BudgetHealthScoreType,
  FinancialLiteracyInsight,
  LongTermGoalProjection,
  Recommendation,
  RebalanceResult,
} from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { MAX_DEBT_PAYOFF_YEARS } from '@/lib/debtPayoff';
import type { DebtPayoffProjection } from '@/lib/debtPayoff';
import { calculateLongTermGoalProjections, generateFinancialLiteracyInsights } from '@/lib/longTermGoals';
import IncomeSummary from './IncomeSummary';
import ExpenseSummary from './ExpenseSummary';
import SavingsSummary from './SavingsSummary';
import BudgetHealthScore from './BudgetHealthScore';
import RecommendationList from './RecommendationList';
import BudgetCard from './BudgetCard';
import ColiCard from './ColiCard';
import PaycheckCard from './PaycheckCard';
import IrregularIncomeCard from './IrregularIncomeCard';
import { calculatePaycheckBreakdown } from '@/lib/paycheckCalculations';
import { calculateIrregularIncomeAnalysis } from '@/lib/irregularIncome';

interface BudgetDashboardProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
  healthScore: BudgetHealthScoreType;
  recommendations: Recommendation[];
  rebalanceResult: RebalanceResult | null;
  debtProjection: DebtPayoffProjection;
}

export default function BudgetDashboard({
  breakdown,
  inputs,
  healthScore,
  recommendations,
  debtProjection,
}: BudgetDashboardProps) {
  const { isOverBudget, deficit, surplus, remainingMonthlyBuffer, netMonthlyIncome } = breakdown;
  const goalProjections = calculateLongTermGoalProjections(inputs, breakdown);
  const literacyInsights = generateFinancialLiteracyInsights(inputs, breakdown, goalProjections);
  const paycheckBreakdown = calculatePaycheckBreakdown(inputs, breakdown);
  const irregularIncomeAnalysis = inputs.incomeVariabilityPercent > 0
    ? calculateIrregularIncomeAnalysis(inputs, breakdown)
    : null;

  // Buffer status banner
  const bufferBanner = isOverBudget ? (
    <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <span className="text-2xl">🚨</span>
      <div>
        <p className="font-bold text-red-800">Over Budget by {formatCurrency(deficit)}/month</p>
        <p className="text-sm text-red-600">Use Auto Balance to bring the budget in line.</p>
      </div>
    </div>
  ) : remainingMonthlyBuffer < 250 ? (
    <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="font-bold text-amber-800">Thin Buffer: {formatCurrency(remainingMonthlyBuffer)}/month</p>
        <p className="text-sm text-amber-600">Consider reducing some expenses for more breathing room.</p>
      </div>
    </div>
  ) : (
    <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
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
        <SavingsSummary breakdown={breakdown} inputs={inputs} />
        <ExpenseSummary breakdown={breakdown} inputs={inputs} />
        <BudgetHealthScore healthScore={healthScore} />
      </div>

      {/* Detailed sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CoreExpensesDetail breakdown={breakdown} inputs={inputs} />
        <TransportationDetail breakdown={breakdown} inputs={inputs} />
        {inputs.petsEnabled && <PetsDetail inputs={inputs} breakdown={breakdown} />}
        <SavingsDetail breakdown={breakdown} inputs={inputs} />
        <DebtPayoffDetail projection={debtProjection} debtCount={inputs.debts.length} strategy={inputs.debtPayoffStrategy} />
        <LongTermGoalsDetail goals={goalProjections} />
        <FinancialLiteracyDetail insights={literacyInsights} />
        <PaycheckCard paycheckBreakdown={paycheckBreakdown} />
        <ColiCard currentState={inputs.state} annualSalary={inputs.annualSalary} />
        {irregularIncomeAnalysis && (
          <IrregularIncomeCard analysis={irregularIncomeAnalysis} />
        )}
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
  const housingPaymentLabel = inputs.housingMode === 'homeowner' ? 'Mortgage' : 'Rent';
  return (
    <BudgetCard title="Core Living Expenses">
      <DetailRow
        label={housingPaymentLabel}
        value={formatCurrency(inputs.housingMode === 'homeowner' ? inputs.mortgagePayment : inputs.rent)}
        sub={`${formatPercent(breakdown.primaryHousingPaymentAsPercentGross)} of gross`}
      />
      {inputs.housingMode === 'homeowner' ? (
        <>
          <DetailRow label="Property Tax" value={formatCurrency(inputs.propertyTax)} />
          <DetailRow label="Home Insurance" value={formatCurrency(inputs.homeInsurance)} />
          <DetailRow label="Maintenance Reserve" value={formatCurrency(inputs.homeMaintenanceReserve)} />
        </>
      ) : (
        <>
          <DetailRow label="Pet Rent" value={formatCurrency(inputs.petRent)} />
          <DetailRow label="Renters Insurance" value={formatCurrency(inputs.rentersInsurance)} />
        </>
      )}
      <DetailRow label="Utilities (excl. phone)" value={formatCurrency(breakdown.totalUtilities - inputs.phone)} />
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
        label={inputs.housingMode === 'homeowner' ? 'Home Equity Monthly' : 'House Fund Monthly'}
        value={formatCurrency(inputs.houseDownPaymentContribution)}
        sub={`${formatCurrency(breakdown.annualHouseFund)}/year`}
      />
      <DetailRow
        label={inputs.housingMode === 'homeowner' ? 'Home Equity Target' : 'Down Payment Target'}
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
      <DetailRow label="Debt Payoff" value={formatCurrency(breakdown.totalDebtPayoff)} />
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

function DebtPayoffDetail({
  projection,
  debtCount,
  strategy,
}: {
  projection: DebtPayoffProjection;
  debtCount: number;
  strategy: DebtPayoffStrategy;
}) {
  const latestMonth = projection.schedule[projection.schedule.length - 1];
  const latestBalance = latestMonth?.remainingBalance ?? 0;
  const oneYearBalance = projection.schedule.find((entry) => entry.month === 12)?.remainingBalance;

  // Sample chart data at most ~24 points for readability
  const chartData = useMemo(() => {
    const sched = projection.schedule;
    if (sched.length === 0) return [];
    const step = Math.max(1, Math.ceil(sched.length / 24));
    const sampled = sched.filter((_, i) => i % step === 0 || i === sched.length - 1);
    return sampled.map((s) => ({ month: s.month, balance: s.remainingBalance }));
  }, [projection.schedule]);

  const strategyLabel = strategy === 'avalanche' ? '📉 Avalanche' : '❄️ Snowball';

  return (
    <BudgetCard title="Debt Payoff Timeline">
      {debtCount === 0 ? (
        <p className="text-sm text-gray-600">Add debt accounts in the form to calculate payoff timing.</p>
      ) : projection.schedule.length === 0 ? (
        <p className="text-sm text-gray-600">
          Add a minimum payment or extra debt payoff amount to generate a timeline.
        </p>
      ) : (
        <>
          <DetailRow label="Strategy" value={strategyLabel} />
          <DetailRow label="Tracked Debts" value={`${debtCount}`} />
          <DetailRow label="Monthly Debt Budget" value={formatCurrency(projection.monthlyBudget)} />
          <DetailRow
            label="Debt-Free Timeline"
            value={
              projection.monthsToDebtFree === null
                ? `Not reached in ${MAX_DEBT_PAYOFF_YEARS} years`
                : `${projection.monthsToDebtFree} months`
            }
          />
          <DividerLine />
          <DetailRow label="Total Interest Paid" value={formatCurrency(projection.totalInterestPaid)} />
          <DetailRow label="Total Principal Paid" value={formatCurrency(projection.totalPrincipalPaid)} />
          <DetailRow
            label="Projected Balance After 12 Months"
            value={formatCurrency(oneYearBalance ?? latestBalance)}
          />
          {projection.monthsToDebtFree === null && (
            <DetailRow label="Projected Ending Balance" value={formatCurrency(latestBalance)} />
          )}

          {/* Amortization chart */}
          {chartData.length > 1 && (
            <>
              <DividerLine />
              <p className="text-xs font-medium text-gray-700 mb-2">Balance Over Time</p>
              <div className="w-full h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `mo ${v}`}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                      width={46}
                    />
                    <Tooltip
                      formatter={(v) => [formatCurrency(typeof v === 'number' ? v : 0), 'Balance']}
                      labelFormatter={(l) => `Month ${l}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      fill="#eff6ff"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Per-debt breakdown */}
          {projection.perDebt.length > 0 && (
            <>
              <DividerLine />
              <p className="text-xs font-medium text-gray-700 mb-2">Per-Debt Breakdown</p>
              <div className="space-y-2">
                {projection.perDebt.map((d) => (
                  <div key={d.id} className="rounded-md border border-gray-100 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-gray-800 truncate">{d.name}</span>
                      <span className="text-gray-500 shrink-0">{d.interestRate}% APR</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-gray-600">
                      <span>Balance: {formatCurrency(d.originalBalance)}</span>
                      <span>
                        {d.paidOffMonth === null
                          ? `Not paid off in ${MAX_DEBT_PAYOFF_YEARS} yrs`
                          : `Paid off: month ${d.paidOffMonth}`}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      Interest cost: {formatCurrency(d.totalInterestPaid)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </BudgetCard>
  );
}

function LongTermGoalsDetail({ goals }: { goals: LongTermGoalProjection[] }) {
  return (
    <BudgetCard title="Long-Term Goals">
      {goals.length === 0 ? (
        <p className="text-sm text-gray-600">Add goals in the form to track timelines for retirement, travel, kids, and major purchases.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{goal.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{goal.category.replace('_', ' ')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${goal.status === 'funded' || goal.status === 'on_track' ? 'bg-green-50 text-green-700' : goal.status === 'no_deadline' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                  {goal.status === 'funded'
                    ? 'Funded'
                    : goal.status === 'on_track'
                      ? 'On track'
                      : goal.status === 'no_deadline'
                        ? 'Needs date'
                        : goal.status === 'past_due'
                          ? 'Past due'
                          : 'Behind'}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${goal.isOnTrack ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.max(4, goal.progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 space-y-1">
                <DetailRow label="Saved So Far" value={formatCurrency(goal.currentAmount)} />
                <DetailRow label="Remaining" value={formatCurrency(goal.remainingAmount)} />
                <DetailRow
                  label="Needed Per Month"
                  value={goal.monthsRemaining === null ? 'Set target month' : formatCurrency(goal.requiredMonthlySavings)}
                  sub={goal.targetDate ? `Target ${goal.targetDate}` : undefined}
                />
                <DetailRow
                  label={`Current ${goal.fundingSourceLabel}`}
                  value={formatCurrency(goal.currentMonthlyFunding)}
                  sub={
                    goal.monthsRemaining && goal.monthsRemaining > 0
                      ? `${goal.monthsRemaining} month${goal.monthsRemaining === 1 ? '' : 's'} remaining`
                      : goal.targetDate
                        ? 'Target date reached'
                        : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </BudgetCard>
  );
}

function FinancialLiteracyDetail({ insights }: { insights: FinancialLiteracyInsight[] }) {
  const priorityStyles = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <BudgetCard title="Financial Literacy Tips">
      {insights.length === 0 ? (
        <p className="text-sm text-gray-600">Your budget already covers the main literacy signals this planner tracks.</p>
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${priorityStyles[insight.priority]}`}>
                  {insight.priority}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{insight.detail}</p>
            </div>
          ))}
        </div>
      )}
    </BudgetCard>
  );
}

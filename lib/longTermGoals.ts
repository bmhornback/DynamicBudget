import type {
  BudgetBreakdown,
  BudgetInputs,
  FinancialLiteracyInsight,
  LongTermGoalProjection,
  LongTermSavingsGoal,
} from '@/types/budget';

const GENERAL_GOAL_CATEGORIES = new Set(['vacation', 'kids', 'major_purchase', 'custom']);
export const MONTHLY_COMPARISON_EPSILON = 0.005;

function parseGoalMonth(targetDate: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(targetDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function getMonthsRemaining(targetDate: string, now = new Date()): number | null {
  const parsed = parseGoalMonth(targetDate);
  if (!parsed) return null;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return (parsed.year - currentYear) * 12 + (parsed.month - currentMonth);
}

function getGoalFundingSource(goal: LongTermSavingsGoal, inputs: BudgetInputs, breakdown: BudgetBreakdown): number {
  switch (goal.category) {
    case 'house':
      return breakdown.effectiveHouseDownPaymentContribution;
    case 'retirement':
      return breakdown.retirement.monthly401k + breakdown.retirement.monthlyIRA + breakdown.monthlyHSA;
    default:
      return inputs.generalCashSavings;
  }
}

function getGoalFundingLabel(goal: LongTermSavingsGoal): string {
  switch (goal.category) {
    case 'house':
      return 'house fund';
    case 'retirement':
      return 'retirement contributions';
    default:
      return 'general cash savings';
  }
}

export function calculateLongTermGoalProjections(
  inputs: BudgetInputs,
  breakdown: BudgetBreakdown
): LongTermGoalProjection[] {
  const goals = Array.isArray(inputs.longTermGoals) ? inputs.longTermGoals : [];
  const baseProjections = goals.map((goal) => {
    const targetAmount = Math.max(0, goal.targetAmount || 0);
    const currentAmount = Math.max(0, goal.currentAmount || 0);
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const monthsRemaining = getMonthsRemaining(goal.targetDate);
    const requiredMonthlySavings =
      targetAmount <= 0 || currentAmount >= targetAmount
        ? 0
        : monthsRemaining && monthsRemaining > 0
          ? remainingAmount / monthsRemaining
          : remainingAmount;

    return {
      goal,
      targetAmount,
      currentAmount,
      remainingAmount,
      monthsRemaining,
      requiredMonthlySavings,
      progress: targetAmount > 0 ? Math.min(currentAmount / targetAmount, 1) : 0,
      baseFunding: getGoalFundingSource(goal, inputs, breakdown),
      fundingSourceLabel: getGoalFundingLabel(goal),
    };
  });

  const totalGeneralRequired = baseProjections
    .filter(
      ({ goal, monthsRemaining, remainingAmount }) =>
        GENERAL_GOAL_CATEGORIES.has(goal.category) &&
        remainingAmount > 0 &&
        monthsRemaining !== null &&
        monthsRemaining > 0
    )
    .reduce((sum, item) => sum + item.requiredMonthlySavings, 0);
  const openEndedGeneralGoalCount = baseProjections.filter(
    ({ goal, remainingAmount, monthsRemaining }) =>
      GENERAL_GOAL_CATEGORIES.has(goal.category) &&
      remainingAmount > 0 &&
      monthsRemaining === null
  ).length;

  return baseProjections.map((item) => {
    const isGeneralGoal = GENERAL_GOAL_CATEGORIES.has(item.goal.category);
    const currentMonthlyFunding = isGeneralGoal
      ? item.remainingAmount <= 0
        ? 0
        : item.monthsRemaining !== null && item.monthsRemaining > 0 && totalGeneralRequired > 0
        ? (inputs.generalCashSavings * item.requiredMonthlySavings) / totalGeneralRequired
        : item.monthsRemaining === null && totalGeneralRequired <= 0
          ? inputs.generalCashSavings / Math.max(1, openEndedGeneralGoalCount)
          : 0
      : item.baseFunding;

    let status: LongTermGoalProjection['status'];
    if (item.remainingAmount <= 0 && item.targetAmount > 0) {
      status = 'funded';
    } else if (item.monthsRemaining === null) {
      status = 'no_deadline';
    } else if (item.monthsRemaining <= 0) {
      status = 'past_due';
    } else {
      status =
        currentMonthlyFunding + MONTHLY_COMPARISON_EPSILON >= item.requiredMonthlySavings
          ? 'on_track'
          : 'behind';
    }

    return {
      id: item.goal.id,
      name: item.goal.name,
      category: item.goal.category,
      targetAmount: item.targetAmount,
      currentAmount: item.currentAmount,
      remainingAmount: item.remainingAmount,
      targetDate: item.goal.targetDate,
      monthsRemaining: item.monthsRemaining,
      requiredMonthlySavings: item.requiredMonthlySavings,
      currentMonthlyFunding,
      progress: item.progress,
      isOnTrack: status === 'funded' || status === 'on_track',
      fundingSourceLabel: item.fundingSourceLabel,
      status,
    };
  });
}

export function generateFinancialLiteracyInsights(
  inputs: BudgetInputs,
  breakdown: BudgetBreakdown,
  goals: LongTermGoalProjection[]
): FinancialLiteracyInsight[] {
  const insights: FinancialLiteracyInsight[] = [];
  const behindGoals = goals.filter((goal) => goal.status === 'behind' || goal.status === 'past_due');
  const totalMinimumDebtPayments = (inputs.debts ?? []).reduce(
    (sum, debt) => sum + (debt.minimumPayment ?? 0),
    0
  );
  const highInterestDebts = (inputs.debts ?? []).filter((debt) => (debt.interestRate ?? 0) >= 8);

  if (breakdown.retirement.retirementSavingsRate < 0.15) {
    insights.push({
      id: 'retirement_compounding',
      priority: 'high',
      title: 'Build retirement contributions early',
      detail: 'Reaching at least 15% of gross income for retirement improves long-run compounding and reduces pressure on future budgets.',
    });
  }

  if (inputs.emergencyFundContribution <= 0) {
    insights.push({
      id: 'emergency_fund_foundation',
      priority: 'high',
      title: 'Protect goals with an emergency fund',
      detail: 'A cash buffer helps you avoid pausing retirement or long-term goals when a car repair, medical bill, or job change hits.',
    });
  }

  if (inputs.hsaEligible && !inputs.maxOutHSA) {
    insights.push({
      id: 'hsa_tax_advantaged',
      priority: 'medium',
      title: 'Use tax-advantaged accounts first',
      detail: '401(k), IRA, and HSA contributions can improve after-tax wealth faster than saving the same dollars in a taxable account.',
    });
  } else if (
    (!inputs.hsaEligible || inputs.maxOutHSA) &&
    (!inputs.maxOut401k || (!inputs.maxOutIRA && inputs.iraContribution <= 0))
  ) {
    insights.push({
      id: 'tax_advantaged_order',
      priority: 'medium',
      title: 'Review your savings order of operations',
      detail: 'Employer match and tax-advantaged accounts are often the highest-impact places to save before building large taxable balances.',
    });
  }

  if (behindGoals.length > 0) {
    insights.push({
      id: 'goal_tradeoffs',
      priority: breakdown.remainingMonthlyBuffer < 250 ? 'high' : 'medium',
      title: 'Align timelines with available cash flow',
      detail: 'If several goals are behind schedule, shorten the list, extend timelines, or raise monthly savings so each target has a realistic funding path.',
    });
  }

  if (
    highInterestDebts.length > 0 &&
    breakdown.totalDebtPayoff <= totalMinimumDebtPayments + MONTHLY_COMPARISON_EPSILON
  ) {
    insights.push({
      id: 'debt_vs_savings',
      priority: 'medium',
      title: 'High-interest debt can outrun investing',
      detail: 'Paying down expensive debt often delivers a stronger guaranteed return than sending the same money to medium-term goals.',
    });
  }

  if (breakdown.remainingMonthlyBuffer > 500 && goals.length > 0) {
    insights.push({
      id: 'surplus_assignment',
      priority: 'low',
      title: 'Give every surplus dollar a job',
      detail: 'When your plan already has slack, assigning extra buffer to your most urgent goal can materially shorten the timeline.',
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 4);
}

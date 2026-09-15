import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import { calculateLongTermGoalProjections } from '../longTermGoals';
import { calculateAnnualExpensePlan } from '../annualExpenses';
import { generateDecisionSupportSummaries } from '../decisionSupport';

describe('decisionSupport', () => {
  it('surfaces annual expense readiness and debt tradeoff summaries', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      taxableInvestments: 400,
      annualExpenses: [
        {
          id: 'insurance',
          name: 'Car Insurance',
          category: 'insurance' as const,
          annualAmount: 1200,
          currentSaved: 0,
          dueMonth: new Date().getMonth() + 1,
          isEssential: true,
        },
      ],
      debts: [
        {
          id: 'card',
          name: 'Credit Card',
          balance: 4000,
          interestRate: 18,
          minimumPayment: 100,
        },
      ],
    };

    const breakdown = calculateBudgetBreakdown(inputs);
    const annualExpensePlan = calculateAnnualExpensePlan(inputs.annualExpenses);
    const goals = calculateLongTermGoalProjections(inputs, breakdown);
    const summaries = generateDecisionSupportSummaries(inputs, breakdown, annualExpensePlan, goals);

    expect(summaries.map((summary) => summary.id)).toContain('annual-expense-readiness');
    expect(summaries.map((summary) => summary.id)).toContain('debt-vs-investing');
  });
});

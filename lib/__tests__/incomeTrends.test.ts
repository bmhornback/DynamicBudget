import { addIncomeEntry, getMonthlyIncomeSummary, initializeIncomeHistory } from '../incomeTrends';

describe('incomeTrends', () => {
  it('initializes empty income history', () => {
    const history = initializeIncomeHistory();
    expect(history.entries).toEqual([]);
    expect(history.version).toBe(1);
    expect(history.lastUpdated).toBeTruthy();
  });

  it('adds entries and aggregates monthly totals', () => {
    let history = initializeIncomeHistory();
    history = addIncomeEntry(history, '2026-10', 8000, 2000);
    history = addIncomeEntry(history, '2026-10', 1000, 500, 'Late-close adjustment');
    history = addIncomeEntry(history, '2026-11', 8200, 1500);

    const summary = getMonthlyIncomeSummary(history);
    expect(summary).toEqual([
      {
        month: '2026-10',
        basePay: 9000,
        commission: 2500,
        totalPay: 11500,
      },
      {
        month: '2026-11',
        basePay: 8200,
        commission: 1500,
        totalPay: 9700,
      },
    ]);
  });
});


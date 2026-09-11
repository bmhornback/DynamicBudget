import type {
  SpendingEntry,
  SpendingHistory,
  TrackableCategory,
  CategoryMetrics,
  BudgetInputs,
} from '@/types/budget';

// Mapping of trackable categories to budget input fields and display labels
export const CATEGORY_CONFIG: Record<
  TrackableCategory,
  { label: string; budgetField: keyof BudgetInputs }
> = {
  dining_out: { label: 'Dining Out', budgetField: 'diningOut' },
  gasoline: { label: 'Gasoline', budgetField: 'fuel' },
  electricity: { label: 'Electricity', budgetField: 'electric' },
  water: { label: 'Water', budgetField: 'water' },
  online_shopping: { label: 'Online Shopping', budgetField: 'personalSpending' },
  groceries: { label: 'Groceries', budgetField: 'groceries' },
  subscriptions: { label: 'Subscriptions', budgetField: 'subscriptions' },
  gas_utility: { label: 'Gas (Utility)', budgetField: 'gas' },
  internet: { label: 'Internet', budgetField: 'internet' },
  phone: { label: 'Phone', budgetField: 'phone' },
};

/**
 * Initialize empty spending history
 */
export function initializeSpendingHistory(): SpendingHistory {
  return {
    entries: [],
    lastUpdated: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Generate a unique ID for a spending entry
 */
function generateEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a new spending entry to history
 */
export function addSpendingEntry(
  history: SpendingHistory,
  category: TrackableCategory,
  amount: number,
  date: string,
  note?: string
): SpendingHistory {
  const entry: SpendingEntry = {
    id: generateEntryId(),
    date,
    category,
    amount,
    note,
    createdAt: new Date().toISOString(),
  };

  return {
    ...history,
    entries: [...history.entries, entry],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Delete a spending entry by ID
 */
export function deleteSpendingEntry(
  history: SpendingHistory,
  entryId: string
): SpendingHistory {
  return {
    ...history,
    entries: history.entries.filter((e) => e.id !== entryId),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get entries for a specific category
 */
export function getCategoryEntries(
  history: SpendingHistory,
  category: TrackableCategory
): SpendingEntry[] {
  return history.entries.filter((e) => e.category === category);
}

/**
 * Get entries for a date range
 */
export function getEntriesByDateRange(
  history: SpendingHistory,
  startDate: string,
  endDate: string
): SpendingEntry[] {
  return history.entries.filter(
    (e) => e.date >= startDate && e.date <= endDate
  );
}

/**
 * Get the last N months of entries for a category
 */
export function getCategoryEntriesLastNMonths(
  history: SpendingHistory,
  category: TrackableCategory,
  months: number
): SpendingEntry[] {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const entries = getCategoryEntries(history, category);
  return entries.filter(
    (e) =>
      new Date(e.date) >= startDate && new Date(e.date) <= new Date()
  );
}

/**
 * Get spending grouped by month for a category
 */
export function getMonthlySpending(
  entries: SpendingEntry[]
): Record<string, number> {
  const monthly: Record<string, number> = {};

  entries.forEach((entry) => {
    const monthKey = entry.date.substring(0, 7); // YYYY-MM format
    monthly[monthKey] = (monthly[monthKey] || 0) + entry.amount;
  });

  return monthly;
}

/**
 * Calculate average monthly spending from entries
 */
export function calculateAverageMonthly(entries: SpendingEntry[]): number {
  if (entries.length === 0) return 0;

  const monthly = getMonthlySpending(entries);
  const months = Object.keys(monthly).length;

  if (months === 0) return 0;

  const total = Object.values(monthly).reduce((sum, val) => sum + val, 0);
  return total / months;
}

/**
 * Calculate current month spending
 */
export function getCurrentMonthSpending(
  entries: SpendingEntry[]
): number {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;

  const currentMonthEntries = entries.filter(
    (e) => e.date.substring(0, 7) === currentMonthKey
  );

  return currentMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * Calculate trend direction (up/down/stable) and percent change
 */
export function calculateTrend(
  entries: SpendingEntry[]
): { trend: 'up' | 'down' | 'stable'; percent: number } {
  const monthly = getMonthlySpending(entries);
  const months = Object.keys(monthly).sort();

  if (months.length < 2) {
    return { trend: 'stable', percent: 0 };
  }

  const lastMonthKey = months[months.length - 1];
  const prevMonthKey = months[months.length - 2];

  const lastMonth = monthly[lastMonthKey] || 0;
  const prevMonth = monthly[prevMonthKey] || 0;

  if (prevMonth === 0) {
    return { trend: 'stable', percent: 0 };
  }

  const percentChange = ((lastMonth - prevMonth) / prevMonth) * 100;
  const trend: 'up' | 'down' | 'stable' =
    percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';

  return { trend, percent: percentChange };
}

/**
 * Forecast next month's spending using simple linear regression
 */
export function forecastNextMonth(entries: SpendingEntry[]): number {
  const monthly = getMonthlySpending(entries);
  const months = Object.keys(monthly).sort();

  if (months.length === 0) return 0;
  if (months.length === 1) return monthly[months[0]];

  // Simple linear regression on last 3-6 months
  const recentMonths = months.slice(-6);
  const values = recentMonths.map((m) => monthly[m]);

  if (values.length < 2) return values[values.length - 1];

  // Calculate linear regression slope
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = x.reduce((a, b) => a + b) / n;
  const yMean = values.reduce((a, b) => a + b) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (values[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Forecast next month (position n)
  const forecast = intercept + slope * n;
  return Math.max(0, forecast); // Don't forecast negative spending
}

/**
 * Calculate category metrics for a single category
 */
export function calculateCategoryMetrics(
  category: TrackableCategory,
  history: SpendingHistory,
  inputs: BudgetInputs
): CategoryMetrics {
  const entries = getCategoryEntriesByMonth(history, category, 6);
  const { trend, percent: trendPercent } = calculateTrend(entries);
  const config = CATEGORY_CONFIG[category];
  const budgetedMonthly = (inputs[config.budgetField] as number) || 0;

  const averageMonthly = calculateAverageMonthly(entries);
  const currentMonthSpent = getCurrentMonthSpending(entries);
  const variance = currentMonthSpent - budgetedMonthly;
  const forecast = forecastNextMonth(entries);

  return {
    category,
    label: config.label,
    entries,
    totalSpent: entries.reduce((sum, e) => sum + e.amount, 0),
    averageMonthly,
    currentMonthSpent,
    budgetedMonthly,
    variance,
    trend,
    trendPercent,
    forecastNextMonth: forecast,
  };
}

/**
 * Helper function to get last N months of entries for a category
 */
function getCategoryEntriesByMonth(
  history: SpendingHistory,
  category: TrackableCategory,
  months: number
): SpendingEntry[] {
  return getCategoryEntriesLastNMonths(history, category, months);
}

/**
 * Calculate metrics for all trackable categories
 */
export function calculateAllCategoryMetrics(
  history: SpendingHistory,
  inputs: BudgetInputs
): CategoryMetrics[] {
  return Object.keys(CATEGORY_CONFIG).map((category) =>
    calculateCategoryMetrics(category as TrackableCategory, history, inputs)
  );
}

/**
 * Generate insights and recommendations based on spending trends
 */
export interface SpendingInsight {
  id: string;
  type: 'warning' | 'positive' | 'info';
  title: string;
  message: string;
  category?: TrackableCategory;
  actionable: boolean;
}

export function generateSpendingInsights(
  history: SpendingHistory,
  inputs: BudgetInputs
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  const metrics = calculateAllCategoryMetrics(history, inputs);

  metrics.forEach((metric) => {
    // Alert if current month is significantly over budget
    if (metric.budgetedMonthly > 0 && metric.currentMonthSpent > metric.budgetedMonthly * 1.2) {
      insights.push({
        id: `overspend_${metric.category}`,
        type: 'warning',
        title: `Over Budget: ${metric.label}`,
        message: `You've spent $${metric.currentMonthSpent.toFixed(2)} this month, ${(
          ((metric.currentMonthSpent - metric.budgetedMonthly) /
            metric.budgetedMonthly) *
          100
        ).toFixed(0)}% over your budget of $${metric.budgetedMonthly.toFixed(2)}.`,
        category: metric.category,
        actionable: true,
      });
    }

    // Alert if upward trend
    if (metric.trend === 'up' && metric.trendPercent > 10) {
      insights.push({
        id: `uptrend_${metric.category}`,
        type: 'warning',
        title: `Rising Trend: ${metric.label}`,
        message: `Your ${metric.label.toLowerCase()} spending has increased ${metric.trendPercent.toFixed(0)}% this month. Consider reviewing your habits.`,
        category: metric.category,
        actionable: true,
      });
    }

    // Positive reinforcement for staying under budget
    if (
      metric.budgetedMonthly > 0 &&
      metric.currentMonthSpent > 0 &&
      metric.currentMonthSpent < metric.budgetedMonthly * 0.8
    ) {
      insights.push({
        id: `positive_${metric.category}`,
        type: 'positive',
        title: `Great Job: ${metric.label}`,
        message: `You're $${(metric.budgetedMonthly - metric.currentMonthSpent).toFixed(2)} under budget this month.`,
        category: metric.category,
        actionable: false,
      });
    }

    // Forecast alert
    if (
      metric.budgetedMonthly > 0 &&
      metric.forecastNextMonth > metric.budgetedMonthly * 1.15 &&
      metric.entries.length > 0
    ) {
      insights.push({
        id: `forecast_${metric.category}`,
        type: 'info',
        title: `Forecast: ${metric.label}`,
        message: `Based on your spending pattern, next month's ${metric.label.toLowerCase()} may be ~$${metric.forecastNextMonth.toFixed(2)}.`,
        category: metric.category,
        actionable: false,
      });
    }
  });

  return insights;
}

/**
 * Get spending comparison data for visualization
 */
export interface MonthlyComparison {
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export function getMonthlyComparison(
  category: TrackableCategory,
  history: SpendingHistory,
  inputs: BudgetInputs,
  months: number = 6
): MonthlyComparison[] {
  const entries = getCategoryEntriesLastNMonths(history, category, months);
  const monthly = getMonthlySpending(entries);
  const config = CATEGORY_CONFIG[category];
  const budgetedMonthly = (inputs[config.budgetField] as number) || 0;

  const now = new Date();
  const comparisons: MonthlyComparison[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`;
    const actual = monthly[monthKey] || 0;
    const variance = actual - budgetedMonthly;

    comparisons.push({
      month: monthKey,
      budgeted: budgetedMonthly,
      actual,
      variance,
    });
  }

  return comparisons;
}

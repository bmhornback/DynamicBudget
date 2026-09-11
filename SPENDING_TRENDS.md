# Spending Trends Feature

## Overview

The Spending Trends feature allows users to track actual spending across 10 different categories and compare it against their budgeted amounts. This helps identify spending patterns, predict future expenses, and correct bad spending habits.

## Key Concepts

### Trackable Categories

The following expense categories can be tracked:
- **Dining Out** - Restaurants and takeout
- **Gasoline** - Fuel for vehicles
- **Electricity** - Electric utility bills
- **Water** - Water utility bills
- **Gas (Utility)** - Natural gas bills
- **Groceries** - Grocery shopping
- **Subscriptions** - Recurring subscriptions
- **Internet** - Internet service
- **Phone** - Phone service
- **Online Shopping** - Online purchases

Each category is mapped to the corresponding budget input field for seamless integration with the budget planning system.

## User Journey

### 1. Logging Spending
1. Navigate to the **📈 Trends** tab in the header
2. Use the **💰 Log Spending** form on the left panel
3. Select a category from the dropdown
4. Enter the amount spent
5. Select the date (defaults to today)
6. Optionally add a note (e.g., "Lunch with team")
7. Click "Add Spending" to save

### 2. Viewing Trends
On the right panel, users see:
- **Insights & Alerts**: Warnings about overspending and positive reinforcement
- **Category Breakdown**: For each tracked category:
  - Trend indicator (up/down/stable with % change)
  - Current month spending vs. budget
  - Average monthly spending
  - Forecast for next month
  - Progress bar showing budget consumption
  - 6-month trend chart
- **Recent Entries**: Last 10 spending entries across all categories

### 3. Understanding the Data

#### Trend Direction
- 📈 **Up**: Spending increased >5% from previous month (warning)
- 📉 **Down**: Spending decreased >5% from previous month (positive)
- ➡️ **Stable**: Change within ±5% threshold

#### Insights Generated
1. **Overspending Alert**: Triggered when current month > 120% of budget
2. **Uptrend Warning**: Triggered when spending trend is up >10%
3. **Positive Reinforcement**: When current month < 80% of budget
4. **Forecast Alert**: When next month's forecast > 115% of budget

#### Forecasting
Forecasts use simple linear regression on the last 6 months of data:
- If <2 months of data: uses most recent month
- If 2-6 months: calculates trend line and extrapolates
- Negative forecasts are clamped to $0

## Data Storage

### Storage Location
All data is stored in the browser's `localStorage` with key `movemath_budget_inputs`.

### Storage Format
```json
{
  "version": 1,
  "inputs": {
    // ... budget inputs
    "spendingHistory": {
      "entries": [
        {
          "id": "entry_1234567890_abc123def",
          "date": "2024-01-15",
          "category": "dining_out",
          "amount": 42.50,
          "note": "Dinner with friends",
          "createdAt": "2024-01-15T20:30:00Z"
        }
      ],
      "lastUpdated": "2024-01-15T20:30:00Z",
      "version": 1
    }
  },
  "timestamp": "2024-01-15T20:30:00Z"
}
```

### Persistence
- Data auto-saves after every change with 500ms debounce
- No backend server required
- Export as JSON for backup
- Import JSON to restore data

## API Reference

### `lib/spendingTrends.ts`

#### Core Functions

**`initializeSpendingHistory(): SpendingHistory`**
- Creates an empty spending history object
- Call on app startup or when resetting data

**`addSpendingEntry(history, category, amount, date, note): SpendingHistory`**
- Adds a new spending entry to the history
- Generates unique ID and timestamp
- Returns updated history object

**`deleteSpendingEntry(history, entryId): SpendingHistory`**
- Removes a spending entry by ID
- Returns updated history object

**`getCategoryEntries(history, category): SpendingEntry[]`**
- Returns all entries for a specific category
- Useful for category-specific analysis

**`getMonthlySpending(entries): Record<string, number>`**
- Groups entries by month (YYYY-MM format)
- Returns object with monthly totals

#### Analysis Functions

**`calculateTrend(entries): { trend, percent }`**
- Compares last month vs previous month
- Returns trend direction and % change
- Used for the trend indicator

**`forecastNextMonth(entries): number`**
- Uses linear regression on last 6 months
- Returns predicted spending for next month
- Useful for planning ahead

**`calculateCategoryMetrics(category, history, inputs): CategoryMetrics`**
- Comprehensive analysis for one category
- Returns all metrics for the category card
- Includes trend, forecast, variance calculations

**`calculateAllCategoryMetrics(history, inputs): CategoryMetrics[]`**
- Runs analysis for all trackable categories
- Returns array of CategoryMetrics

#### Insights & Visualization

**`generateSpendingInsights(history, inputs): SpendingInsight[]`**
- Analyzes all categories and generates insights
- Returns array of actionable alerts
- Types: 'warning' | 'positive' | 'info'

**`getMonthlyComparison(category, history, inputs, months): MonthlyComparison[]`**
- Returns budgeted vs actual for each month
- Used by TrendChart component for visualization

### `lib/storage.ts`

**`saveBudgetInputs(inputs): void`**
- Persists budget inputs to localStorage
- Debounced automatically by component

**`loadBudgetInputs(): BudgetInputs | null`**
- Retrieves budget inputs from localStorage
- Returns null if not found or version mismatch

**`exportBudgetAsJSON(inputs): string`**
- Serializes budget data to JSON string
- Includes version and export date

**`importBudgetFromJSON(jsonString): BudgetInputs | null`**
- Parses and validates JSON import
- Returns null if invalid or version mismatch

### `types/budget.ts`

**`TrackableCategory`** - Union type of all trackable categories

**`SpendingEntry`** - Single spending transaction
```ts
interface SpendingEntry {
  id: string;
  date: string; // YYYY-MM-DD
  category: TrackableCategory;
  amount: number;
  note?: string;
  createdAt: string; // ISO timestamp
}
```

**`CategoryMetrics`** - Complete analysis for one category
```ts
interface CategoryMetrics {
  category: TrackableCategory;
  label: string;
  entries: SpendingEntry[];
  totalSpent: number;
  averageMonthly: number;
  currentMonthSpent: number;
  budgetedMonthly: number;
  variance: number; // Actual - Budgeted
  trend: 'up' | 'down' | 'stable';
  trendPercent: number; // % change from previous month
  forecastNextMonth: number;
}
```

## Components

### `SpendingTracker.tsx`
Form component for logging new spending entries.
- Category dropdown
- Amount input
- Date picker
- Optional note field
- Form validation

### `TrendAnalysis.tsx`
Main dashboard showing trends and insights.
- Insights section with alerts
- Category breakdown cards
- Progress bars
- Trend charts
- Recent entries list

### `TrendChart.tsx`
Recharts-based visualization component.
- Composed chart showing budgeted vs actual
- 6-month historical data
- Interactive tooltips
- Responsive sizing

## Future Enhancements

1. **Category Editing**: Allow users to create custom categories
2. **Recurring Entries**: Auto-populate recurring expenses
3. **Batch Import**: Import CSV of spending data
4. **Goals**: Set spending goals and get alerts
5. **Sharing**: Share budget snapshots with others
6. **Mobile App**: Native iOS/Android version
7. **Cloud Sync**: Optional Supabase/Firebase backup
8. **Splitting**: Split expenses between categories
9. **Attachments**: Attach receipts to entries
10. **AI Insights**: ML-powered anomaly detection

## Troubleshooting

### Data Not Saving
- Check if localStorage is enabled in browser
- Verify not in private/incognito mode
- Check browser console for errors

### Charts Not Displaying
- Ensure at least 1 spending entry exists
- Check that recharts library loaded correctly
- Try refreshing the page

### Forecasts Seem Wrong
- Forecasts need at least 2 months of data
- Check that historical data is accurate
- Linear regression may be inaccurate with volatile spending

## Best Practices

1. **Log Regularly**: Log spending as soon as possible for accuracy
2. **Use Notes**: Add context to entries for better insights
3. **Review Monthly**: Check trends at the end of each month
4. **Backup Data**: Export JSON regularly as backup
5. **Test Budgets**: Use the budget planner to set realistic targets
6. **Act on Insights**: Use alerts to identify and correct habits

## Technical Notes

- All calculations are pure functions (no side effects)
- Storage uses JSON serialization with versioning
- Charts use Recharts with responsive sizing
- TypeScript strict mode enabled
- No external APIs or server required
- Single-page app with static export

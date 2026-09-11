# DynamicBudget

Take your overall salary, subtract taxes, ensure savings, and dynamically customize the rest.

## Features

### Budget Planning
- Input your annual salary and let MoveMath automatically calculate your take-home income
- Estimate taxes for federal, state, and payroll
- Plan retirement savings (401k, IRA)
- Budget for all major expense categories
- Automatic or manual budget modes

### Spending Trends & Analytics
- **Track Actual Spending**: Log your expenses in real-time by category (dining out, gasoline, utilities, online shopping, etc.)
- **View Trends**: See how your actual spending compares to your budget over time
- **Visual Charts**: Monthly spending trends with budget vs. actual comparisons
- **Smart Insights**: Get alerts when you're overspending or when spending is trending upward
- **Forecasting**: Predict next month's spending based on historical patterns
- **Own Your Data**: All data is stored locally in your browser—no accounts, no servers

### Budget Management
- Auto-rebalance your budget with multiple strategies
- Lock fields to prevent changes
- Save and load multiple budget scenarios
- Budget health score (0-100) based on key financial metrics
- Scenario presets for common situations (San Diego, Atlanta, etc.)

## How It Works

1. **Enter Income**: Input your annual salary, state, and filing status
2. **Review Expenses**: Set budgets for all categories (housing, food, transportation, etc.)
3. **Optimize**: Use auto-rebalance or adjust manually to reach your savings goals
4. **Track Spending**: Log actual expenses in the Trends tab to see how you're doing
5. **Analyze**: Review charts and insights to identify spending patterns and opportunities

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Charting**: Recharts
- **Storage**: Browser localStorage
- **Deployment**: Static site (no server required)

## Getting Started

### Installation
```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Building
```bash
npm run build
npm start
```

The static site is generated in the `out/` directory and can be deployed anywhere.

## Data Privacy

All calculations and data are processed entirely in your browser. No data is sent to any server:
- ✅ Budget calculations are 100% client-side
- ✅ Spending history is saved to your browser's localStorage
- ✅ Tax estimates use simplified 2024 rates
- ✅ You own all your data

## Roadmap

See [DEV_PLAN.md](DEV_PLAN.md) for our complete development roadmap and feature priorities.

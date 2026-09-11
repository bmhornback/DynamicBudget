# Dynamic Budget Planner

Take your overall salary, subtract taxes, ensure savings, and dynamically allocate the rest with precision.

**Dynamic Budget** is a personal finance planning tool that empowers high-income earners to confidently budget across major life changes like relocating, changing jobs, or major life events. It combines real-world tax modeling with dynamic budget rebalancing to help you make informed financial decisions.

## Features

### Core Capabilities
- 📊 **Real-world tax modeling** — 2026 Federal, state (all 50 US states + DC), payroll, and bonus taxation
- 💰 **Comprehensive expense tracking** — Housing, utilities, transport, pets, food, health, lifestyle, and more
- 🎯 **Smart budget modes** — Auto-mode (AI recommendations) or manual mode for full control
- 🔄 **Dynamic rebalancing** — 6 rebalancing strategies to optimize your budget allocation
- 📈 **Budget health score** — 0–100 rating with actionable recommendations
- 🎨 **Scenario presets** — Pre-built scenarios (San Diego, Atlanta, living with parents, etc.)
- 💾 **Data persistence** — Auto-save your budget to your browser (no account needed)
- 🔒 **Field locking** — Lock specific expenses to protect planned allocations
- 💎 **Flexible savings modes** — Save fixed amounts or a percentage of net income
- 📱 **Responsive design** — Works great on desktop and mobile

### Spending Trends & Analytics
- 📉 **Track Actual Spending** — Log your expenses in real-time by category (dining out, gasoline, utilities, online shopping, etc.)
- 📊 **View Trends** — See how your actual spending compares to your budget over 6 months
- 📈 **Visual Charts** — Monthly spending trends with budget vs. actual comparisons (powered by Recharts)
- 💡 **Smart Insights** — Get alerts when you're overspending or when spending is trending upward
- 🔮 **Forecasting** — Predict next month's spending using linear regression on historical patterns
- 🔐 **Own Your Data** — All data is stored locally in your browser—no accounts, no servers

### Upcoming Features
- 💳 Roth vs. Traditional IRA distinction, HSA/FSA support
- 📤 Export to PDF/CSV, share budgets via link
- 📋 Multi-scenario comparison
- 🏠 Debt amortization and homeowner modes
- 🌐 Support for 2027 tax year (once IRS publishes brackets)

## Getting Started

### Try It Online
Visit the app at: https://bmhornback.github.io/DynamicBudget

### Run Locally
```bash
# Clone the repository
git clone https://github.com/bmhornback/DynamicBudget.git
cd DynamicBudget

# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build for Production
```bash
# Create a static export
npm run build

# The app is ready in the `out/` directory
# Can be hosted on GitHub Pages, Netlify, or any static host
```

## How It Works

1. **Enter Income**: Input your annual salary, state, and filing status
2. **Review Expenses**: Set budgets for all categories (housing, food, transportation, etc.)
3. **Optimize**: Use auto-rebalance or adjust manually to reach your savings goals
4. **Track Spending**: Log actual expenses in the Trends tab to see how you're doing
5. **Analyze**: Review charts and insights to identify spending patterns and opportunities

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Charting**: Recharts
- **Storage**: Browser localStorage (no server required)
- **State**: React hooks (useState, useCallback, useMemo) — no external state manager
- **Testing**: Jest with ts-jest

## Architecture

### File Structure
```
lib/
  budgetCalculations.ts   ← Core budget math
  budgetHealthScore.ts    ← 0–100 score + thresholds
  formatters.ts           ← Number/currency formatting
  rebalanceBudget.ts      ← 6 rebalancing strategies
  recommendations.ts      ← Actionable suggestions
  taxCalculations.ts      ← Federal, state, payroll tax
  spendingTrends.ts       ← Trend analysis & forecasting
  storage.ts              ← localStorage persistence
types/
  budget.ts               ← All TypeScript interfaces
components/
  SpendingTracker.tsx     ← Expense logging form
  TrendAnalysis.tsx       ← Analytics dashboard
  TrendChart.tsx          ← 6-month trend chart
  [other UI components]
app/
  page.tsx                ← Main app (Budget + Trends tabs)
  layout.tsx
  globals.css
```

### Calculation Pipeline
```
User Input
    ↓
calculateBudgetBreakdown() → Breaks salary into take-home + deductions
    ↓
calculateBudgetHealthScore() → 0–100 score based on savings, health, balance
    ↓
generateRecommendations() → Actionable suggestions based on score
    ↓
rebalanceBudget() → Reallocate across 6 strategies or user-defined allocation
    ↓
Display Updated Budget
```

All calculations are **pure functions** — no side effects, making them trivially unit-testable.

## Data Privacy

All calculations and data are processed entirely in your browser. No data is sent to any server:
- ✅ Budget calculations are 100% client-side
- ✅ Spending history is saved to your browser's localStorage
- ✅ Tax estimates use current 2026 rates (federal + all 50 US states + DC)
- ✅ You own all your data

## Documentation

- **[DEV_PLAN.md](./DEV_PLAN.md)** — Development roadmap, features, tech debt register
- **[SPENDING_TRENDS.md](./SPENDING_TRENDS.md)** — Detailed guide for the spending trends tracking feature
- **[SAVINGS_PERCENTAGE.md](./SAVINGS_PERCENTAGE.md)** — Guide for percentage-based savings goals

## Development

### Running Tests
```bash
npm run test              # Run tests once
npm run test:watch       # Watch mode for active development
```

### Linting
```bash
npm run lint
```

### Available Scripts
```bash
npm run dev              # Development server (hot reload)
npm run build            # Static export for production
npm run start            # Serve the built app locally
npm run test             # Run Jest tests
npm run test:watch       # Jest watch mode
npm run lint             # ESLint check
```

## Roadmap

See [DEV_PLAN.md](./DEV_PLAN.md) for a detailed development roadmap organized by epic:

- **v0.9 — Solid Foundation** (current): Core testing, localStorage, accessibility basics
- **v1.0 — Ship It**: Polished, tested tool with 10+ state taxes, data visualization
- **v1.5 — Grow It**: Multi-scenario comparison, debt payoff, export/share
- **v2.0 — Platform**: Optional cloud sync, public landing page, analytics

## Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests
4. Ensure `npm run lint` and `npm run test` pass
5. Submit a pull request

## License

MIT

## Support

For questions, issues, or ideas, please [open an issue](https://github.com/bmhornback/DynamicBudget/issues).

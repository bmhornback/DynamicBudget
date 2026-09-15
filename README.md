# Dynamic Budget Planner

Take your overall salary, subtract taxes, ensure savings, and dynamically allocate the rest with precision.

**Dynamic Budget** is a personal finance planning tool that empowers high-income earners to confidently budget across major life changes like relocating, changing jobs, or major life events. It combines real-world tax modeling with dynamic budget rebalancing to help you make informed financial decisions.

## Features

### Core Capabilities
- 📊 **Real-world tax modeling** — 2026 Federal, state (all 50 US states + DC), payroll, and supplemental income taxation (bonus/ESPP/RSU) with bonus mode toggle (blended annual vs federal 22% lump-sum withholding)
- 💳 **Retirement-aware tax planning** — Traditional vs. Roth IRA support, HSA modeling, and deduction-aware recommendations
- 💰 **Comprehensive expense tracking** — Housing, utilities, transport, pets, food, health, lifestyle, and more
- 🎯 **Smart budget modes** — Auto-mode (AI recommendations) or manual mode for full control
- 🔄 **Dynamic rebalancing** — 6 rebalancing strategies to optimize your budget allocation
- 📈 **Budget health score** — 0–100 rating with actionable recommendations
- ♿ **Accessibility-minded UI** — Keyboard-operable controls, labeled form fields, live status messaging, and undoable recovery for major budgeting actions
- 👆 **Mobile workspace gestures** — Swipe between the editor and dashboard panels on small screens without losing vertical scroll
- 🎯 **Long-term goal planner** — Track house, vacation, retirement, kids, and custom major-purchase targets
- 🧾 **Business expense guide** — Categorize, track, and estimate potential business tax write-offs with recordkeeping prompts
- 🎨 **Scenario presets** — Pre-built scenarios (San Diego, Atlanta, living with parents, etc.)
- 🆚 **Scenario comparison** — Compare your live budget side-by-side with up to 2 preset or saved-budget scenarios
- 🏠 **Homeowner mode** — Switch between renter and homeowner budgets with mortgage/property-tax aware housing totals
- 💳 **Debt payoff timeline** — Track debt accounts with avalanche/snowball strategy selector, per-debt amortization breakdown, balance-over-time chart, and interest cost per debt
- 💾 **Data persistence** — Auto-save your budget to your browser (no account needed)
- 🖨️ **PDF export** — Save a print-friendly dashboard summary to PDF from the Export / Import menu
- 📦 **JSON import/export** — Backup and restore budgets locally
- 📊 **CSV export** — Download monthly and annual budget line items for spreadsheet use
- 🔗 **Shareable budget links** — Copy a compact URL payload that loads the current budget configuration
- 📝 **Clipboard summary export** — Copy a markdown-like budget summary for Slack/Notion sharing
- 📋 **Named budgets** — Save and reload custom budget snapshots locally
- 🏷️ **Scenario notes** — Add an optional note to saved budgets so comparisons preserve the scenario's intent
- 🔒 **Field locking** — Lock specific expenses to protect planned allocations
- 💎 **Flexible savings modes** — Save fixed amounts or a percentage of net income
- 🗓️ **Sinking funds & recurring annual expenses** — Plan ahead for non-monthly bills like registration, insurance, travel, home maintenance, and holidays with automatic monthly reserve guidance
- 💬 **In-app feedback widget** — Open a prefilled GitHub issue directly from the app, with optional plain-text budget context for faster triage
- 📚 **Learn hub** — Browse short budgeting guides tied to housing, retirement, rule-of-thumb budgeting, and cost-of-living planning
- 🔍 **Discovery metadata** — Rich Open Graph metadata, sitemap, robots rules, and app JSON-LD improve sharing and search discovery
- 📱 **Responsive design** — Works great on desktop and mobile

### Spending Trends & Analytics
- 📉 **Track Actual Spending** — Log your expenses in real-time by category (dining out, gasoline, utilities, online shopping, etc.)
- 📊 **View Trends** — See how your actual spending compares to your budget over 6 months
- 📈 **Visual Charts** — Monthly spending trends with budget vs. actual comparisons (powered by Recharts)
- 💡 **Smart Insights** — Get alerts when you're overspending or when spending is trending upward
- 🔮 **Forecasting** — Predict next month's spending using linear regression on historical patterns
- 🧠 **Financial literacy tips** — Personalized education prompts around emergency funds, retirement, debt, and goal tradeoffs
- 🧭 **Planning assumptions panel** — See why take-home, savings, and rebalancing changed plus the current tax-model limitations
- 📈 **Local-only product analytics** — Track preset usage, rebalance runs, learn CTA clicks, and feedback submissions in browser storage only
- 🔐 **Own Your Data** — All data is stored locally in your browser—no accounts, no servers

- 🏦 **Paycheck calculator** — Select your pay frequency (weekly, bi-weekly, semi-monthly, or monthly) and see every budget line translated into per-paycheck amounts; includes a deduction waterfall (gross → pre-tax → taxes → take-home) and a per-paycheck allocation view with spend-ratio bars
- 📊 **Irregular income scenarios** — Set a monthly income variability % (ideal for freelancers and commission earners) to instantly see your budget at the P25 (bad month), P50 (typical), and P75 (good month) income levels; at-risk variable expenses are surfaced automatically when a bad month would push you into deficit
- 👥 **Partner / dual-income mode** — Switch to Married Filing Jointly and enable a second earner's salary and 401(k); federal and state taxes are calculated on the combined household income using MFJ brackets (Social Security wage-base cap applied individually), and the dashboard's Income Summary switches to a household view showing each partner's gross income and the combined take-home
- 📅 **Savings goal timeline calculator** — Each long-term goal card shows how many months it will take to reach the target at your current funding rate, plus an interactive "Reach in X months" input that instantly back-calculates the required monthly contribution; emergency fund and house fund rows in Savings Detail also display projected months to fully funded
- 🧠 **Decision support summaries** — A dedicated dashboard card now highlights recurring-bill readiness, home-purchase timing, debt-vs-investing tradeoffs, and dual-income reliance
- 📈 **Annual savings projection chart** — Full-width line chart on the dashboard showing projected 401(k), IRA, Taxable, House Fund, and Emergency Fund balances at 1, 3, 5, and 10 years; includes an interactive growth-rate slider (0–15%, default 7%) and a summary table of all account balances at each horizon
- ⚖️ **Rebalance diff visualization** — After running Auto Balance, a before/after horizontal bar chart animates each field change; reductions are colored red and increases are green, with a delta summary table beneath

### Upcoming Features
- 📋 Deeper multi-scenario workflows
- 🏠 Dedicated marketing/landing experience
- 🌐 Support for 2027 tax year (once IRS publishes brackets)

## Getting Started

### Try It Online
Visit the landing page at: https://bmhornback.github.io/DynamicBudget

Open the budget planner directly at: https://bmhornback.github.io/DynamicBudget/app

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
# GitHub Pages project-site paths are prefixed for /DynamicBudget in production builds
# Can be hosted on GitHub Pages, Netlify, or any static host
```

## How It Works

1. **Enter Income**: Input your annual salary, state, and filing status
2. **Review Expenses**: Set budgets for all categories (housing, food, transportation, etc.)
3. **Optimize**: Use auto-rebalance or adjust manually to reach your savings goals
4. **Plan Goals**: Set long-term target amounts and dates for goals like retirement, travel, kids, or large purchases
5. **Track Spending**: Log actual expenses in the Trends tab to see how you're doing
6. **Review Business Deductions**: Use the Business tab to classify expenses, estimate write-offs, and capture documentation notes
7. **Analyze**: Review charts, recommendations, and literacy tips to identify opportunities

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
  annualProjection.ts     ← 1/3/5/10-year savings projection (E4-T6)
  analytics.ts            ← Local-only aggregate product event counters
  formatters.ts           ← Number/currency formatting
  longTermGoals.ts        ← Goal projections + literacy insights
  rebalanceBudget.ts      ← 6 rebalancing strategies
  recommendations.ts      ← Actionable suggestions
  seo.ts                  ← Shared metadata + JSON-LD helpers
  taxCalculations.ts      ← Federal, state, payroll tax
  spendingTrends.ts       ← Trend analysis & forecasting
  storage.ts              ← localStorage persistence
types/
  budget.ts               ← All TypeScript interfaces
components/
  AnnualProjectionChart.tsx  ← 1/3/5/10-year savings line chart (E4-T6)
  RebalanceDiffChart.tsx     ← Before/after rebalance bar chart (E4-T7)
  SpendingTracker.tsx     ← Expense logging form
  TrendAnalysis.tsx       ← Analytics dashboard
  TrendChart.tsx          ← 6-month trend chart
  [other UI components]
app/
  page.tsx                ← Main app (Budget, Trends, and Business tabs, scenario comparison embedded in Budget view)
  learn/page.tsx          ← Educational content tied to app workflows
  layout.tsx              ← Metadata + app shell
  robots.ts               ← Search crawler rules
  sitemap.ts              ← Static route discovery
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
- **[/app](https://bmhornback.github.io/DynamicBudget/app)** — The budget planner application
- **[/learn](https://bmhornback.github.io/DynamicBudget/learn)** — Short educational guides tied to in-app planning decisions

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

**Current focus:** deepen growth/discovery work with a future landing page, stronger educational content, and continued workflow polish.

See [DEV_PLAN.md](./DEV_PLAN.md) for a detailed development roadmap organized by epic:

- **v1.0 closeout** (current): Stability, accessibility, typing cleanup, and roadmap rebaseline
- **v1.5 — Grow It**: Multi-scenario comparison, debt payoff ✅, homeowner mode, export/share
- **v2.0 — Platform**: Optional cloud sync, landing page expansion, and MCP integrations after core budgeting work is complete

## Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests
4. Ensure `npm run lint` and `npm run test` pass
5. Submit a pull request

## License

Proprietary (All Rights Reserved).  
See [LICENSE](./LICENSE) for terms. All monetization rights are reserved by the copyright holder.

## Support

For questions, issues, or ideas, please [open an issue](https://github.com/bmhornback/DynamicBudget/issues).

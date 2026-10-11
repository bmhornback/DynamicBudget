# Dynamic Budget Planner

Take your overall salary, subtract taxes, ensure savings, and dynamically allocate the rest with precision.

**Dynamic Budget** is a personal finance planning tool that empowers high-income earners to confidently budget across major life changes like relocating, changing jobs, or major life events. It combines real-world tax modeling with dynamic budget rebalancing to help you make informed financial decisions.

## Features

### Core Capabilities
- 📊 **Real-world tax modeling** — 2026 Federal, state (all 50 US states + DC), payroll, and supplemental income taxation (bonus/ESPP/RSU) with bonus mode toggle (blended annual vs federal 22% lump-sum withholding)
- 💳 **Retirement-aware tax planning** — Traditional vs. Roth IRA support, HSA modeling, and deduction-aware recommendations
- 💰 **Comprehensive expense tracking** — Housing, utilities, transport, pets, food, health, lifestyle, and more (including separate dental, vision, and life insurance inputs)
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
- 🔗 **Shareable budget links** — Copy a compact URL payload that loads the current budget configuration with versioned compatibility and legacy migration guardrails
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

### Current Roadmap Status
- ✅ GitHub Pages deployment workflow added for static export publishing
- ✅ MCP server package metadata prepared for public distribution
- ✅ Accounting connector framework added for provider-agnostic sync registry, category mapping, and sync status/error surfacing
- ✅ Documentation refresh completed for MCP/Pages setup and remaining integration tasks
- 🌐 Support for 2027 tax year (once IRS publishes brackets)

## Getting Started

### Try It Online
Visit the landing page at: https://bmhornback.github.io/DynamicBudget

Open the budget planner directly at: https://bmhornback.github.io/DynamicBudget/app

### Run Locally

Prerequisites:
- Node.js 20+ recommended
- npm (included with Node.js)

```bash
# Clone the repository
git clone https://github.com/bmhornback/DynamicBudget.git
cd DynamicBudget

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Then open:
- http://localhost:3000

If port 3000 is already in use, start on a different port:

```bash
PORT=3001 npm run dev
```

The app is fully local-first and stores data in the browser (`localStorage`), so no backend or database setup is required for local use.

### Preview a Production Build Locally

```bash
# Build the static export
npm run build

# Serve the built app locally (preview the production output)
npx serve out
```

The generated app is static and can be hosted on GitHub Pages, Netlify, or any static host. In production builds, the app applies the `/DynamicBudget` base path used for GitHub Pages.

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

Cloud sync and external integrations are planned behind a **backend adapter/provider model** so managed and self-hosted options can be evaluated without changing product workflows.

## Data Privacy

All calculations and data are processed entirely in your browser. No data is sent to any server:
- ✅ Budget calculations are 100% client-side
- ✅ Spending history is saved to your browser's localStorage
- ✅ Tax estimates use current 2026 rates (federal + all 50 US states + DC)
- ✅ You own all your data

### Multi-user segmentation and governance

Future multi-user / shared-device scenarios should segment data by authenticated user identity before any browser storage or cloud sync is used. The storage layer keeps a user-scoped key namespace (`getScopedStorageKey(...)`) so each user can have isolated budget, preset, and named-budget records without mixing data across accounts.

- User data must be keyed by a stable userId or tenantId, not by a shared global key
- Local-only fallbacks remain the default safe state until a provider has explicit data-access policies
- Any cloud sync or connector flow must enforce least-privilege access, per-user ACLs, and audit logs
- Deletion/export/privacy workflows should be per-user and documented before enabling multi-user support

This preserves the current privacy-first static model while providing a clear path for compliant user segmentation in later releases.

## Documentation

- **[DEV_PLAN.md](./DEV_PLAN.md)** — Development roadmap, feature status, and remaining milestones
- **[MCP_SERVER.md](./MCP_SERVER.md)** — Setup and usage guide for the DynamicBudget MCP server
- **[mcp/MCP_TOOLS.md](./mcp/MCP_TOOLS.md)** — Tool reference, validation rules, and example calls for the AI integration
- **[SPENDING_TRENDS.md](./SPENDING_TRENDS.md)** — Detailed guide for the spending trends tracking feature
- **[SAVINGS_PERCENTAGE.md](./SAVINGS_PERCENTAGE.md)** — Guide for percentage-based savings goals
- **[docs/decision-records/backend-provider-evaluation.md](./docs/decision-records/backend-provider-evaluation.md)** — Backend provider scorecard framework and staged recommendation criteria
- **[docs/decision-records/ai-determinism-policy.md](./docs/decision-records/ai-determinism-policy.md)** — Deterministic AI/JEV policy and explainability requirements, including the in-app “Why this recommendation?” trace panel
- **[docs/decision-records/receipt-data-privacy-policy.md](./docs/decision-records/receipt-data-privacy-policy.md)** — Receipt OCR data handling and privacy controls
- **[docs/decision-records/integration-security-model.md](./docs/decision-records/integration-security-model.md)** — Security model for accounting integrations and sync workflows
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

**Current focus:** prioritize platform-readiness work in this order:
1. Backend provider evaluation and adapter architecture decision
2. Deterministic AI decision engine (JEV scoring + explainability traces)
3. Receipt OCR ingestion MVP with confirmation/quality controls
4. QuickBooks read-only integration MVP
5. Connector framework expansion for broader accounting ecosystem integrations

See [DEV_PLAN.md](./DEV_PLAN.md) for a detailed development roadmap organized by epic:

- **v1.0 closeout** (current): Stability, accessibility, typing cleanup, and roadmap rebaseline
- **v1.5 — Grow It**: Multi-scenario comparison, debt payoff ✅, homeowner mode, export/share
- **v2.0 — Platform**: Optional provider-agnostic cloud sync, deterministic AI decision support, receipt ingestion, and accounting integrations
- **E1-T7b (GitHub Pages deployment)** ✅: `.github/workflows/deploy-pages.yml` publishes the static export to Pages
- **E10-T1 (Calc Engine Library)** ✅: All 12 core calculation modules verified React/browser-free; public API documented with JSDoc; test coverage raised to 95%+ on public API
- **E10-T2 (MCP Tool Schemas)** ✅: JSON Schema definitions for 5 MCP tools in `mcp/schemas/`; full reference in `mcp/MCP_TOOLS.md`
- **E10-T3 (MCP Server)** ✅: Runnable MCP server in `src/mcp-server/` using `@modelcontextprotocol/sdk`; 5 tools connected to the calc engine; 31 integration tests; build via `npm run build:mcp`
- **E10-T4 (AI Client Integration)** ▶️ Remaining: verify real Claude/ChatGPT usage, capture feedback, and fix any integration issues
- **E10-T5 (Publish & Document)** ✅: package metadata and docs are prepared for external publication; real registry publication remains a maintainer-side release action

## Planned Enhancements (Phased)

### Phase A — Platform Foundations
- Backend provider abstraction with scorecard-driven selection across managed and self-hosted options
- Provider recommendation by growth stage (MVP, growth, enterprise)

### Phase B — Deterministic Decision Intelligence
- Rule-bound AI assistance (deterministic output mode)
- JEV scoring for tradeoffs (debt vs investing, relocation, emergency fund timing)
- Transparent decision traces and policy profiles (conservative, balanced, aggressive)

### Phase C — Receipt-to-Budget Automation
- Receipt upload/capture + OCR extraction of merchant/date/total/tax/category candidates
- User confirmation and manual correction before commit
- Duplicate detection and confidence-based review rules

### Phase D — Accounting Integrations
- QuickBooks read-only import (accounts, categories, expenses, transactions)
- Category mapping and sync status/error surfacing
- Connector framework expansion: Xero, Wave, CSV flows, Plaid transaction feeds
- Accountant package export + year-end readiness checklist

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

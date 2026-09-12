# DynamicBudget — Development Plan

> **App:** DynamicBudget (repo: DynamicBudget)
> **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
> **Deployment target:** Static web app — fully self-hosted in the browser, no server required. `npm run build` outputs to `out/` and can be served via GitHub Pages, any static host, or opened directly as a local file. Follows the same pattern as [FirstTimeFitness](https://github.com/bmhornback/FirstTimeFitness).
> **Purpose:** A client-side personal finance tool that takes an annual salary, estimates taxes, ensures savings, and lets the user dynamically budget every remaining dollar.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Vision & Goals](#2-vision--goals)
3. [Architecture Overview](#3-architecture-overview)
4. [Epic Index](#4-epic-index)
5. [Epic 1 — Developer Experience & Quality](#epic-1--developer-experience--quality)
6. [Epic 2 — Persistence & User Data](#epic-2--persistence--user-data)
7. [Epic 3 — Enhanced Tax Engine](#epic-3--enhanced-tax-engine)
8. [Epic 4 — Data Visualization](#epic-4--data-visualization)
9. [Epic 5 — Advanced Budget Features](#epic-5--advanced-budget-features)
10. [Epic 6 — UX Polish & Accessibility](#epic-6--ux-polish--accessibility)
11. [Epic 7 — Export & Sharing](#epic-7--export--sharing)
12. [Epic 8 — Backend & Cloud Sync (Phase 2)](#epic-8--backend--cloud-sync-phase-2)
13. [Epic 9 — Growth & Discovery](#epic-9--growth--discovery)
14. [Epic 10 — AI Integration & MCP](#epic-10--ai-integration--mcp)
15. [Release Milestones](#release-milestones)
16. [Tech Debt Register](#tech-debt-register)
17. [Definition of Done](#definition-of-done)

---

## 1. Current State Summary

### What exists today

| Area | Status |
|---|---|
| Single-page Next.js app (`/`) | ✅ Done |
| Income & tax estimation (federal 2026 + all 50 states + DC) | ✅ Done |
| Full expense input form (housing, utilities, transport, pets, food, health, lifestyle) | ✅ Done |
| Savings & investing fields (fixed amounts OR percentage-based) | ✅ Done |
| Auto/Manual budget modes | ✅ Done |
| Rebalance engine (6 strategies + surplus allocation) | ✅ Done |
| Field locking | ✅ Done |
| Budget health score (0–100) | ✅ Done |
| Recommendations engine | ✅ Done |
| Scenario presets (San Diego, Atlanta, Living w/ Parents, etc.) | ✅ Done |
| Responsive layout (mobile toggle) | ✅ Basic |
| Data persistence (localStorage) | ✅ Done |
| Spending trends tracking | ✅ Done |
| Charts / visualization (Recharts) | ✅ Done |
| Spending insights & forecasting | ✅ Done |
| Export / import JSON | ✅ Done |
| Export as CSV | ✅ Done |
| Test suite | ✅ Jest (92 tests passing) |
| CI/CD | ✅ GitHub Actions (`ci.yml`) |
| Additional tax states (all 50 + DC) | ✅ Done |
| Roth vs Traditional IRA | ✅ Done |
| HSA / FSA | ✅ HSA modeled |
| Multi-scenario comparison | ✅ Basic side-by-side comparison |
| Named budget slots (save / load / delete by name) | ✅ Done |
| Custom scenario presets (save current state as preset) | ✅ Done |
| Dark mode (system + manual toggle, persisted) | ✅ Done |
| Onboarding card (first-time user walkthrough) | ✅ Done |
| Mobile `inputMode="decimal"` on number inputs | ✅ Done |
| Section collapse/expand animation | ✅ Done |
| Inline field validation (rent warning) | ✅ Done |
| Debt amortization | ❌ Only flat extra-payment field |

### New in This Release (v1.0.0)

✨ **Complete Tax Coverage for All 50 US States + DC**
- Full tax bracket and rate tables for all 50 states plus District of Columbia (51 jurisdictions total)
- 2026 Federal tax brackets with IRS inflation adjustments
- State-specific progressive brackets, flat rates, or no-income-tax configurations
- Accurate tax modeling for relocation scenarios across any US state
- Complete state-level tax coverage, while still using estimated take-home math that excludes county/local taxes and some deductions

✨ **2026 Tax Tables, Retirement Account Modeling, and Scenario Comparison**
- 2026 Federal tax brackets updated with inflation adjustments
- 2026 California state tax brackets updated
- Georgia confirmed at 5.49% flat tax
- Traditional vs. Roth IRA support with recommendation warnings for Traditional IRA phase-out ranges
- HSA contribution modeling with 2026 limits and deduction-aware tax treatment
- New "Save X% of Net Income" feature: Set savings as a percentage that auto-adjusts with income changes
- Savings fields automatically locked when in percentage mode to prevent confusion
- Integration with rebalancing engine for both modes
- New scenario comparison table for side-by-side relocation and savings tradeoff analysis
- 92 Jest tests passing

### Known gaps / rough edges

- Accessibility polish is improved but not complete — additional keyboard, contrast, and screen-reader audits are still desirable.
- Multi-scenario comparison currently focuses on the live budget plus preset scenarios; named saved budgets are still future work.
- 2027 tax brackets not yet published by IRS (typically available late 2026).
- County/local taxes and some state surtaxes are simplified or excluded for brevity (e.g., Maryland county taxes, California surtax on income >$1M fully modeled but county taxes omitted).

---

## 2. Vision & Goals

**Short-term (v1.0 closeout):** Finish stability, accessibility, and documentation polish so the current feature set feels complete and dependable.

**Medium-term (v1.5 — "Grow It"):** Expand the budgeting workflow with multi-scenario comparison, debt/homeowner planning, and stronger export/share capabilities.

**Long-term (v2.0 — "Platform"):** Optional BaaS-powered cloud sync (Supabase/Firebase), a public landing page, analytics, and MCP/platform work after the core budgeting product is fully polished. Because the app is fully static, any cloud features must use third-party BaaS — there is no custom backend server.

---

## 3. Architecture Overview

```
app/
  page.tsx              ← single route, all state lives here
components/             ← presentational + controlled input components
  BudgetForm.tsx
  BudgetDashboard.tsx
  BudgetCard.tsx
  BudgetFieldInput.tsx
  BudgetSection.tsx
  BudgetHealthScore.tsx
  ExpenseSummary.tsx
  IncomeSummary.tsx
  RebalanceControls.tsx
  RecommendationList.tsx
  SavingsSummary.tsx
  ScenarioPresets.tsx
lib/                    ← pure calculation utilities (no React)
  budgetCalculations.ts
  budgetHealthScore.ts
  defaultScenarios.ts
  formatters.ts
  rebalanceBudget.ts
  recommendations.ts
  taxCalculations.ts
types/
  budget.ts             ← all TypeScript interfaces
```

**State management:** All state is lifted to `page.tsx` using `useState` + `useCallback` + `useMemo`. No global store; this is intentional and works at current scale. If complexity grows, consider Zustand.

**Calculation pipeline:**
```
inputs → calculateBudgetBreakdown → calculateBudgetHealthScore
                                  → generateRecommendations
       → rebalanceBudget (on demand or auto mode)
```

All calculation functions are pure and side-effect-free, which makes them trivially unit-testable.

**Static export:** `next.config.ts` sets `output: "export"`. Running `npm run build` produces an `out/` directory of plain HTML, CSS, and JS — no Node server required at runtime. The app can be:
- Hosted on **GitHub Pages** (free, zero-config with a `gh-pages` branch or `docs/` folder)
- Deployed to any static CDN (Netlify, Vercel static, S3 + CloudFront)
- Opened directly from the local filesystem

This matches the self-hosted browser pattern used by [FirstTimeFitness](https://github.com/bmhornback/FirstTimeFitness).

---

## 4. Epic Index

| # | Epic | Priority | Phase |
|---|---|---|---|
| 1 | Developer Experience & Quality | ✅ Shipped | v1.0 closeout |
| 2 | Persistence & User Data | ✅ Shipped | Complete for current release |
| 3 | Enhanced Tax Engine | ✅ Shipped | Complete for current release |
| 4 | Data Visualization | ✅ Shipped | Complete for current release |
| 5 | Advanced Budget Features | 🟡 Medium | v1.5 |
| 6 | UX Polish & Accessibility | 🟡 Partial | v1.0 closeout → v1.5 |
| 7 | Export & Sharing | 🟡 Medium | v1.5 |
| 8 | Backend & Cloud Sync (BaaS, optional) | 🟢 Low | v2.0 (deferred) |
| 9 | Growth & Discovery | 🟢 Low | v2.0 (deferred) |
| 10 | AI Integration & MCP | 🟢 Low | v2.0 (deferred) |

---

## Epic 1 — Developer Experience & Quality

**Goal:** Establish a reliable foundation with automated testing, linting, and CI so every future change is safe and confident.

### E1-T1 · Set up unit test framework (Jest + ts-jest)
- Install `jest`, `ts-jest`, `@types/jest`
- Add `jest.config.ts` targeting `lib/**` and `types/**`
- Add `npm run test` and `npm run test:watch` scripts
- **Acceptance:** `npm test` runs with zero failures on an empty test suite

### E1-T2 · Unit tests — `taxCalculations.ts`
- Test `federalIncomeTaxEstimate` against known 2024 bracket values for all three filing statuses
- Test `stateIncomeTaxEstimate` for CA single, CA MFJ, GA, no-state-tax
- Test `payrollTaxEstimate` including additional Medicare threshold
- Test `calculateRetirementContribution` with and without `maxOut401k`
- Test `calculateNetMonthlyIncome` for a full round-trip
- **Target:** 100% branch coverage of `taxCalculations.ts`

### E1-T3 · Unit tests — `budgetCalculations.ts`
- Test `calculateBudgetBreakdown` with the `DEFAULT_INPUTS` scenario
- Test each expense-total field individually
- Test edge cases: zero salary, zero rent, pets disabled, no car
- **Target:** 100% branch coverage

### E1-T4 · Unit tests — `rebalanceBudget.ts`
- Test each rebalance strategy (6 strategies × over-budget scenario)
- Test surplus allocation (all `SurplusAllocation` values)
- Test locked-field behavior (locked fields must not change)
- Test `recommendations_only` strategy does not mutate inputs

### E1-T5 · Unit tests — `budgetHealthScore.ts` and `recommendations.ts`
- Score boundary tests for each scoring dimension
- Recommendation trigger tests for all `Recommendation` IDs
- Test that all positive-reinforcement conditions produce the correct recommendation

### E1-T6 · Integration smoke test — page-level
- Set up `@testing-library/react` + `jest-environment-jsdom`
- Render `page.tsx` with all DEFAULT_INPUTS and assert no crash
- Verify the "Surplus" banner renders when budget is balanced

### E1-T7 · GitHub Actions CI workflow
- Create `.github/workflows/ci.yml`
- Steps: install, lint, build, test
- Run on every push and pull request
- Cache `node_modules` and Next.js build cache

### E1-T7b · GitHub Pages deployment workflow
- Create `.github/workflows/deploy.yml` triggered on push to `main`
- Steps: install → `npm run build` → deploy `out/` to GitHub Pages
- Use the official `actions/deploy-pages` action
- Enables zero-infrastructure hosting: the repo itself serves the app

### E1-T8 · ESLint & strict TypeScript tightening
- Enable `"strict": true` in `tsconfig.json` (already `"strict": true` — verify no violations)
- Fix the type-cast issue in `budgetHealthScore.ts` (accessing `houseDownPaymentContribution` off `BudgetBreakdown` via cast — move to accepting `inputs` as a second param or add field to breakdown)
- Add `eslint-plugin-react-hooks` rules
- Zero lint warnings in CI

### E1-T9 · Error boundaries
- Create a `components/ErrorBoundary.tsx` component
- Wrap the main `<main>` content in `page.tsx`
- Display a friendly "something went wrong" card with a reset button

### E1-T10 · Annual tax constant update process
- Extract `TAX_YEAR` constant
- Document in `taxCalculations.ts` which values need updating each January
- Add a comment reminder for `SS_WAGE_BASE`, `ANNUAL_401K_LIMIT`, `ANNUAL_IRA_LIMIT`, and all bracket arrays

---

## Epic 2 — Persistence & User Data

**Goal:** Users should not lose their budget when they close the tab. Auto-save to `localStorage` is the MVP; user accounts are Phase 2.

### E2-T1 · localStorage auto-save
- Create `lib/storage.ts` with `saveBudgetInputs(inputs: BudgetInputs)` and `loadBudgetInputs(): BudgetInputs | null`
- Serialize as JSON; add a version key so schema migrations can be handled
- Debounce writes by 500 ms to avoid write storms
- Load saved state on app mount (before first render)

### E2-T2 · Storage schema versioning
- Add a `STORAGE_VERSION` constant
- On load, if the persisted version doesn't match, fall back to `DEFAULT_INPUTS` and log a warning
- Lay groundwork for a migration function in future

### E2-T3 · Save/load named budgets ✅ Done
- Allow the user to save the current budget under a custom name (stored in `localStorage` as an array of named snapshots)
- Display a "My Budgets" dropdown in the header to load any saved budget
- Allow deleting a saved budget
- **Implemented:** `NamedBudget` type in `budget.ts`; `saveNamedBudget`, `loadNamedBudgets`, `deleteNamedBudget` in `storage.ts`; `components/MyBudgets.tsx` header panel

### E2-T4 · Custom scenario preset creation ✅ Done
- Allow users to save the current state as a new preset (extends the built-in presets list)
- Store custom presets in `localStorage`
- Custom presets are visually differentiated from built-in ones in the `ScenarioPresets` bar
- Allow deleting custom presets
- **Implemented:** `CustomPreset` type in `budget.ts`; `saveCustomPreset`, `loadCustomPresets`, `deleteCustomPreset` in `storage.ts`; updated `ScenarioPresets.tsx` with ⭐ badge + inline delete

### E2-T5 · Import / export JSON ✅ Done
- "Export as JSON" button: downloads `dynamicbudget-budget-YYYY-MM-DD.json`
- "Import JSON" button: parses and validates a previously exported file, replaces current inputs
- Validate schema on import; show an error if the file is incompatible
- **Implemented:** `exportBudgetAsJSON`, `importBudgetFromJSON`, `triggerDownload` in `storage.ts`; `components/ExportImport.tsx` dropdown in header

---

## Epic 3 — Enhanced Tax Engine

**Goal:** Support more states, model Roth vs Traditional IRA, add HSA, and keep tax tables current.

### E3-T1 · Add 10+ major state tax calculations
States to add (in priority order based on population and no-income-tax interest):
1. Texas (no state income tax — alias for `no_state_tax`)
2. Florida (no state income tax)
3. Washington (no state income tax)
4. New York (brackets + NYC surcharge flag)
5. Illinois (flat 4.95%)
6. Colorado (flat 4.4%)
7. Arizona (flat 2.5%)
8. North Carolina (flat 4.5%)
9. Virginia (brackets)
10. Ohio (brackets)
- Add state selector to the form with a full US state dropdown
- Update `STATE_LABELS` and `stateIncomeTaxEstimate`

### E3-T2 · Roth vs Traditional IRA distinction
- Add `iraType: 'traditional' | 'roth'` to `BudgetInputs`
- Traditional IRA: reduce federal taxable income (up to income phase-out limits)
- Roth IRA: after-tax contribution — subtract from take-home but don't reduce taxable income
- Add phase-out income limit warnings in the recommendations engine

### E3-T3 · HSA support
- Add `hsaContribution: number` and `hsaEligible: boolean` to `BudgetInputs`
- HSA contribution is triple-tax-advantaged: pre-tax, tax-free growth, tax-free withdrawal for medical
- Model as pre-tax deduction similar to 401(k)
- Add HSA 2024 limits (`$4,150` single, `$8,300` family) and a "max out HSA" checkbox
- Display HSA contribution in the savings summary

### E3-T4 · Bonus income tax modeling
- Currently `bonusIncome` is simply added to gross and taxed at blended rates
- Model supplemental wage withholding rate (federal flat 22%) as an option
- Add a toggle: "Lump-sum withholding" vs "blended annual rate"

### E3-T5 · ESPP / RSU income modeling
- Add optional `esppIncome: number` and `rsuVestingIncome: number` fields
- Taxed as ordinary income (simplified)
- Display in the income summary as supplemental income

### E3-T6 · 2025+ tax year support
- Update all federal and state brackets to 2025 values once published (IRS typically publishes in October/November)
- Update `ANNUAL_401K_LIMIT` (2025: $23,500) and `ANNUAL_IRA_LIMIT` (2025: $7,000 under 50 / $8,000 50+)
- Add age input and catch-up contribution support (401k: +$7,500 if 50+)

---

## Epic 4 — Data Visualization

**Goal:** Replace the text-heavy dashboard with charts and visual breakdowns that make budget proportions immediately legible.

### E4-T1 · Choose and install charting library
- Evaluate: `recharts` (lightweight, React-native), `chart.js` + `react-chartjs-2`, `visx` (D3-based)
- Recommendation: **recharts** — small bundle, composable, TypeScript-first
- Install and verify no conflicts with Next.js 16 / React 19

### E4-T2 · Pie/donut chart — monthly budget breakdown
- Show gross monthly income divided into: Taxes, Retirement, Housing, Utilities, Transport, Pets, Food, Health, Lifestyle, Savings/Investing, Buffer
- Interactive (hover tooltip shows dollar amount + percentage)
- Responsive (collapses gracefully on mobile)
- Replace or augment the `ExpenseSummary` card

### E4-T3 · Bar chart — expense categories vs recommended thresholds
- Horizontal bar chart showing each category as % of take-home
- Threshold lines (e.g., 30% rent line, 15% car line)
- Color coding: green = under threshold, amber = approaching, red = over

### E4-T4 · Savings progress visual
- Progress bars for:
  - Emergency fund: current contribution rate vs 6-month target timeline
  - House down payment: months-to-goal countdown
  - 401(k): annual contribution vs limit
  - IRA: annual contribution vs limit
- Replace text in `SavingsSummary` / `SavingsDetail`

### E4-T5 · Health score radial/gauge chart
- Replace the plain number display in `BudgetHealthScore` with a visual gauge (0–100 arc)
- Color shifts: red (0–39) → orange (40–59) → yellow (60–74) → green (75–100)
- Animate on value change

### E4-T6 · Annual projection chart
- Line chart showing projected savings balances over 1/3/5/10 years
- Assumes fixed monthly contributions and a configurable annual growth rate (default 7%)
- Shows: 401(k), IRA, Taxable Investments, House Fund, Emergency Fund as stacked/grouped lines

### E4-T7 · Rebalance diff visualization
- When a rebalance runs, show a before/after bar comparison for each changed field
- Color-code reductions (red) vs allocations (green)
- Animate the transition

---

## Epic 5 — Advanced Budget Features

**Goal:** Add depth to the budgeting engine for more complex real-world situations.

### E5-T1 · Multi-scenario comparison view
- Allow the user to open 2–3 budget scenarios side by side
- Each scenario is a full independent `BudgetInputs` state
- A comparison table shows key metrics (take-home, savings rate, health score, buffer) across all scenarios
- Use case: "San Diego $190k vs Atlanta $150k — which makes more sense?"

### E5-T2 · Debt payoff amortization
- Add a `debts` array to `BudgetInputs` (each entry: `name`, `balance`, `interestRate`, `minimumPayment`)
- Calculate time-to-payoff for each debt given extra payment allocation
- Show a debt payoff timeline in a dedicated card
- Integrate with the rebalance engine: "debt snowball" and "debt avalanche" strategies
- **Kickoff progress:** Debt payoff is now tracked separately from investments in budget calculations and dashboard summaries, debt accounts can be added in the form, and a first-pass debt payoff timeline card is live using avalanche/snowball-ready projection logic.

### E5-T3 · Homeownership mode
- Toggle: "Renter" vs "Homeowner"
- Homeowner adds: mortgage payment, property tax, HOA, home insurance, maintenance reserve
- Replace "House Down Payment Fund" with "Home Equity" tracking once in homeowner mode
- Mortgage calculator: loan amount, rate, term → monthly payment
- **Progress:** Added renter/homeowner housing mode toggle, homeowner housing fields (mortgage/property tax/home insurance/maintenance reserve), and homeowner-aware labels for housing payment + home equity tracking in savings/dashboard/comparison surfaces.

### E5-T4 · Cost-of-living index comparison
- Integrate a static COLI dataset (e.g., NerdWallet / MIT Living Wage data)
- When switching states/cities, offer a "Adjust for cost of living" option that scales expenses proportionally
- Show a "purchasing power" comparison: "$150k in Atlanta ≈ $X in San Diego"

### E5-T5 · Paycheck calculator mode
- Input: pay frequency (bi-weekly, semi-monthly, monthly, weekly)
- Output: per-paycheck net amount and per-paycheck allocation of each budget line
- Useful for matching budget to actual paycheck deposits

### E5-T6 · Irregular income support
- For freelancers / variable-income users, add a "Monthly income variability" field
- Show budget at P25 / P50 / P75 income scenarios
- Flag which expenses would cause over-budget at P25

### E5-T7 · Partner / dual-income mode
- Add income fields for a second earner
- Combined household budget with individual tax calculations
- "Married Filing Jointly" triggers combined calculations

### E5-T8 · Savings goal timeline calculator
- For each savings goal (emergency fund, house fund), show:
  - Months to reach target at current rate
  - What monthly contribution would be needed to reach it in N months
  - An input for "I want to reach this in X months" that back-calculates required contribution

---

## Epic 6 — UX Polish & Accessibility

**Goal:** Deliver a polished, accessible, delightful experience across all device sizes.

### E6-T1 · Keyboard navigation audit
- Ensure all interactive elements are reachable and operable via keyboard
- Focus ring visible on all focusable elements
- Logical tab order in the form

### E6-T2 · ARIA attributes and screen reader support
- Add `aria-label`, `aria-describedby`, and `role` attributes to dynamic regions (health score, buffer banner, recommendations)
- Test with VoiceOver (macOS) and NVDA (Windows)
- Budget form fields should have descriptive labels, not just placeholder text

### E6-T3 · Color contrast audit
- Run Lighthouse accessibility audit
- Ensure all text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Fix any amber/yellow text on white backgrounds

### E6-T4 · Mobile form UX improvements ✅ Partial
- Numeric keyboard for all dollar-amount inputs (`inputMode="decimal"`) ✅ Done
- Sticky "Dashboard" button when scrolled into the form on mobile (existing — top-0 header button)
- Collapse/expand sections in the form with smooth animation ✅ Done (CSS transition in `BudgetSection.tsx`)
- Swipe gesture to toggle between form and dashboard on mobile (deferred to v1.5)

### E6-T5 · Form input improvements ✅ Partial
- Currency formatting in inputs (deferred)
- Slider support for high-frequency-adjusted fields (deferred)
- Inline field validation (e.g., warn if rent > monthly income) ✅ Done — rent warns at >50% of gross monthly
- `Tab` key increments numeric inputs (deferred)

### E6-T6 · Animations and transitions
- Smooth number transitions when values change (count-up animation)
- Card entrance animations on initial load
- Rebalance result fade-in
- Health score gauge animation

### E6-T7 · Dark mode ✅ Done
- Respect `prefers-color-scheme` system preference ✅ via `ThemeProvider.tsx`
- Add a manual dark/light/system toggle in the header ✅ `DarkModeToggle` component
- All Tailwind colors tested in dark mode ✅ `dark:` classes applied across header, presets bar, BudgetFieldInput, BudgetSection, OnboardingCard, MyBudgets, ScenarioPresets
- Persist preference to localStorage ✅ `dynamicbudget_theme` key

### E6-T8 · Loading state and skeleton screens
- Add a loading skeleton for the dashboard on initial hydration
- Prevent layout shift on first render

### E6-T9 · Onboarding / empty state ✅ Done
- First-time user sees a brief (dismissible) tooltip or walkthrough card ✅ `components/OnboardingCard.tsx`
- Explain: what the presets are, how Auto vs Manual mode works, what field locking does, My Budgets ✅
- Store "seen onboarding" in localStorage ✅ `dynamicbudget_onboarding_seen` key

---

## Epic 7 — Export & Sharing

**Goal:** Let users capture and share their budgets.

### E7-T1 · PDF export
- "Save as PDF" button using `window.print()` with a dedicated `@media print` stylesheet
- Alternatively, use `jsPDF` or `react-pdf` for programmatic generation
- Output: 1-page budget summary with all categories, health score, and recommendations

### E7-T2 · CSV export ✅ Done
- Export all budget line items and calculated totals as a CSV
- Two formats: Monthly and Annual columns per row
- Filename: `dynamicbudget-budget-YYYY-MM-DD.csv`
- **Implemented:** `exportBudgetAsCSV` in `storage.ts`; wired into `components/ExportImport.tsx` dropdown

### E7-T3 · Shareable URL / link
- Encode budget inputs as a compressed Base64 URL parameter (e.g., `?b=<encoded>`)
- "Copy Share Link" button in the header
- On load, parse the URL parameter and pre-populate inputs
- Max URL length: ~2,000 chars (compress with `pako` / `lz-string`)

### E7-T4 · Clipboard copy — quick summary
- "Copy Summary" button that puts a formatted plain-text budget summary in the clipboard
- Format: markdown-like table suitable for pasting into Slack/Notion

---

## Epic 8 — Backend & Cloud Sync (BaaS, optional)

**Goal:** Optional cross-device sync and budget history via a third-party BaaS — no custom server.

> **Static-first constraint:** The app is a fully static web app (see Architecture section). There are no Next.js API routes and no custom backend server. Any cloud features in this epic must be implemented using a client-side BaaS SDK (Supabase JS client, Firebase SDK, etc.) that the static bundle calls directly.
>
> **Note:** This epic is Phase 2 and should not be started until v1.0 core features are solid.

### E8-T1 · Authentication
- Implement sign-in with GitHub OAuth and/or Google OAuth via Supabase Auth or Firebase Auth
- Unauthenticated users keep full local functionality (localStorage)
- "Sign in to sync" CTA in the header

### E8-T2 · Cloud budget storage
- Use Supabase (Postgres + Row Level Security) or Firestore as the client-side data store
- CRUD: create, read, update, delete named budgets
- User's budgets are private by default (enforced by BaaS RLS rules)

### E8-T3 · Real-time sync
- Optimistic updates on budget change
- Debounced auto-save to BaaS (3s idle)
- Conflict resolution: "last write wins" for MVP

### E8-T4 · Budget history / versions
- Every save creates a timestamped snapshot
- "History" drawer showing past versions with a diff view
- Restore any previous version

### E8-T5 · Public budget sharing
- User can mark a budget as "public" to get a stable shareable URL
- Read-only view for non-owners
- Social preview meta tags (Open Graph)

---

## Epic 9 — Growth & Discovery

**Goal:** Make the app discoverable, trustworthy, and useful to a broader audience.

### E9-T1 · SEO & metadata
- Add `<title>`, `<meta description>`, and Open Graph tags in `layout.tsx`
- Create a `robots.txt` and `sitemap.xml`
- Add structured data (JSON-LD) for the app type

### E9-T2 · Landing page
- Create an `/` marketing route and move the app to `/app`
- Landing page: hero, feature list, screenshot/demo, CTA
- Optimized for "salary budget calculator" search terms

### E9-T3 · Analytics
- Add privacy-respecting analytics (Plausible or Fathom — no cookies, GDPR-friendly)
- Track: page views, scenario preset usage, rebalance count, export usage
- No PII collected

### E9-T4 · Feedback widget
- Simple in-app "Send feedback" button (opens a small form)
- Submissions go to a GitHub Issue or a simple webhook (e.g., Slack)

### E9-T5 · Blog / educational content
- `/learn` section with articles:
  - "How much should I spend on rent?"
  - "The 50/30/20 rule explained"
  - "How to pick a 401(k) contribution percentage"
  - "Comparing cost of living: California vs Georgia"

---

## Epic 10 — AI Integration & MCP

**Goal:** Enable AI assistants (Claude, ChatGPT, etc.) to interact with DynamicBudget via Model Context Protocol (MCP), making budget analysis accessible via natural language queries.

**Context:** DynamicBudget is a fully client-side tool with a sophisticated calculation engine. Exposing this engine through MCP would allow AI assistants to:
- Answer financial "what-if" questions in real-time
- Analyze user budgets without requiring form navigation
- Provide personalized financial insights and recommendations
- Integrate with AI agent workflows

### E10-T1 · Refactor calculation engine into library

**Goal:** Decouple calculation logic from React components to enable external use (MCP, npm package, etc.)

**Tasks:**
- Audit `lib/taxCalculations.ts`, `lib/budgetCalculations.ts`, and related functions to identify:
  - Core calculation functions (no dependencies on React/browser APIs)
  - Helper utilities (constants, type transformations)
  - Input validation logic
- Document the **public API** vs **internal helpers** (mark internal functions clearly)
- Optionally: Consider extracting into a separate npm package (`@dynamicbudget/calc-engine`) for easier reuse
- Add JSDoc comments to all public functions explaining parameters, return values, and edge cases
- Add unit test coverage for all exported functions (target: 95%+ for public API)

### E10-T2 · Define MCP tool schemas

**Goal:** Specify which budget queries should be available via MCP and their input/output contracts.

**Example tools:**
- `calculate_monthly_budget(salary, location, expenses, savings)` → Returns: net income, taxes, surplus/deficit
- `analyze_state_move(current_state, target_state, salary)` → Returns: tax impact, cost of living change, recommendations
- `calculate_retirement_savings(salary, age, contribution_percent, years)` → Returns: projected balance, catch-up eligibility, tax implications
- `get_recommendations(budget)` → Returns: list of prioritized financial advice
- `compare_scenarios(scenario_list)` → Returns: side-by-side comparison with insights

**Deliverables:**
- JSON Schema definitions for each tool
- Clear validation rules for inputs
- Example queries and responses
- Error handling strategy (e.g., invalid income, unsupported states)

### E10-T3 · Build MCP server implementation

**Goal:** Create a Node.js MCP server that exposes budget tools to AI assistants.

**Tasks:**
- Choose MCP framework (e.g., [anthropic/mcp-sdk-js](https://github.com/anthropic/mcp-sdk-js))
- Implement server skeleton with tool registration
- Connect each tool to the calculation engine (using E10-T1 refactoring)
- Add error handling and input validation
- Handle context management (e.g., persist user budget across multiple queries)
- Create a demo/test client to verify tools work end-to-end

**Deliverables:**
- A runnable MCP server (`src/mcp-server/index.ts`)
- Dependency list and installation instructions
- Integration tests (Jest)

### E10-T4 · Test with Claude/ChatGPT integrations

**Goal:** Verify the MCP server works with real AI assistants and provides value.

**Tasks:**
- Register MCP server with Claude Desktop (using Claude Client configuration)
- Write test prompts to verify each tool:
  - "What's my net monthly income if I move to Texas earning $150k?"
  - "Should I max out my 401k at my current income level?"
  - "Compare my current budget with these three savings scenarios"
- Collect feedback on response quality and usefulness
- Debug any integration issues
- Document user experience (e.g., response latency, accuracy)

**Deliverables:**
- Test results and performance metrics
- Any bug fixes or improvements to tool responses
- Integration guide for users/developers

### E10-T5 · Document and publish for external use

**Goal:** Make the MCP server and/or calculation engine available to the open-source and AI developer community.

**Tasks:**
- Write MCP Server README with:
  - Installation & setup instructions
  - Configuration options
  - Tool reference (with examples)
  - Troubleshooting guide
- Publish to npm (or GitHub Releases):
  - Optional: Extract and publish `@dynamicbudget/calc-engine` as a standalone package
  - Optional: Publish MCP server as `@dynamicbudget/mcp-server`
- Add examples and tutorials to the DynamicBudget docs
- Consider licensing and terms for external use
- Monitor GitHub issues/discussions for feedback from integrators

**Deliverables:**
- Public npm packages (if applicable)
- Comprehensive documentation
- Example projects using the MCP server
- License file specifying terms

---

## Release Milestones

### v1.0 closeout — "Finish the Base"
- Epic 1 (DX & Quality): All tasks complete
- Epic 2-T1, T2 (localStorage persistence)
- Epic 6 accessibility baseline plus dynamic-region polish
- Bug fixes: health score typing cleanup, scenario matching, error boundary, tax year constants

### v1.0 — "Ship It"
- Epic 2 complete (persistence, named saves, import/export JSON)
- Epic 3-T1 (10+ state taxes), T2 (Roth IRA), T3 (HSA)
- Epic 4-T1 through T5 (charts: pie, bar, savings progress, health gauge)
- Epic 6 complete (full UX polish)
- Epic 7-T1, T2, T3 (PDF, CSV, share link)

### v1.5 — "Grow It"
- Epic 3 complete
- Epic 4 complete (including projection chart, rebalance diff)
- Epic 5-T1 through T4 (multi-scenario expansion, debt payoff, homeowner mode, COLI)
- Epic 7 complete

### v2.0 — "Platform"
- Epic 5 complete
- Epic 8 complete (auth, cloud sync, history)
- Epic 9 complete (landing page, SEO, analytics)
- Epic 10-T1, T2, T3, T4 (calculation engine refactoring, MCP tools, server implementation, AI assistant integration)

---

## Tech Debt Register

| ID | Description | Severity | Status | Epic Ref |
|---|---|---|---|---|
| TD-1 | `budgetHealthScore.ts` casts `BudgetBreakdown` to access `inputs` fields | Medium | ✅ Resolved | E1-T8 |
| TD-2 | Tax year constants updated to 2026 (401k limit, IRA limit, and brackets refreshed per IRS 2026 adjustments) | High | ✅ Resolved (2026) | E3-T6 |
| TD-3 | Scenario preset matching in `page.tsx` uses fragile field-comparison | Low | ✅ Resolved | E2-T4 |
| TD-4 | No error boundaries — uncaught calculation error crashes the UI | High | ✅ Resolved | E1-T9 |
| TD-5 | No tests — any refactor carries risk | Critical | ✅ Resolved (92 tests) | E1 |
| TD-6 | `totalInvestments` in `budgetCalculations.ts` includes `extraDebtPayoff` (a debt payment, not an investment) | Medium | ✅ Resolved | E5-T2 |
| TD-7 | `BudgetFieldInput.tsx` and `BudgetSection.tsx` are defined but not fully used; `BudgetField` type in `budget.ts` is unused | Low | Open | General |
| TD-8 | `calculateNetMonthlyIncome` treats IRA as subtracting from take-home alongside 401k, but Roth IRA is after-tax — needs to be split | Medium | Open | E3-T2 |
| TD-9 | Calculation engine tightly coupled to React components — needs refactoring for MCP/library use | Medium | Open | E10-T1 |

---

## Definition of Done

A task is **Done** when:

1. **Code is written** and follows the existing conventions (TypeScript strict, functional React, Tailwind for styles)
2. **Unit tests pass** for any logic added or changed in `lib/`
3. **Integration/smoke test passes** if a component is added or significantly modified
4. **Lint passes** (`npm run lint` returns zero warnings)
5. **Build passes** (`npm run build` returns zero errors)
6. **Manually tested** in Chrome (desktop) and Safari (mobile viewport)
7. **No regressions** — all existing tests still pass
8. **PR reviewed** (at minimum a self-review against this checklist)

---

*Last updated: 2026-09-12 — Implemented E2-T5 (Export/Import JSON) and E7-T2 (CSV export) with ExportImport dropdown component in header. Also completed full MoveMath → DynamicBudget rename across all docs and source.*

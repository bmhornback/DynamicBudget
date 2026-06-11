# MoveMath — Development Plan

> **App:** MoveMath (repo: DynamicBudget)
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
14. [Release Milestones](#release-milestones)
15. [Tech Debt Register](#tech-debt-register)
16. [Definition of Done](#definition-of-done)

---

## 1. Current State Summary

### What exists today

| Area | Status |
|---|---|
| Single-page Next.js app (`/`) | ✅ Done |
| Income & tax estimation (federal + CA + GA) | ✅ Done |
| Full expense input form (housing, utilities, transport, pets, food, health, lifestyle) | ✅ Done |
| Savings & investing fields | ✅ Done |
| Auto/Manual budget modes | ✅ Done |
| Rebalance engine (6 strategies + surplus allocation) | ✅ Done |
| Field locking | ✅ Done |
| Budget health score (0–100) | ✅ Done |
| Recommendations engine | ✅ Done |
| Scenario presets (San Diego, Atlanta, Living w/ Parents, etc.) | ✅ Done |
| Responsive layout (mobile toggle) | ✅ Basic |
| Data persistence | ❌ None |
| Charts / visualization | ❌ None |
| Test suite | ❌ None |
| CI/CD | ❌ None |
| Export / share | ❌ None |
| Additional tax states | ❌ Only CA, GA, no-state-tax |
| Roth vs Traditional IRA | ❌ Not differentiated |
| HSA / FSA | ❌ Not modeled |
| Multi-scenario comparison | ❌ Not available |
| Debt amortization | ❌ Only flat extra-payment field |

### Known gaps / rough edges

- `budgetHealthScore.ts` accesses `houseDownPaymentContribution` and `emergencyFundContribution` via a type cast on `BudgetBreakdown` — these aren't actually on the breakdown type; they come from `inputs` directly.
- Tax limits (`ANNUAL_401K_LIMIT = 24500`, `ANNUAL_IRA_LIMIT = 7500`) are hardcoded to 2024 and need annual updates.
- Scenario preset matching in `page.tsx` uses fragile field-comparison heuristics instead of preset ID lookup.
- No error boundaries — a bad input can throw unhandled.

---

## 2. Vision & Goals

**Short-term (v1.0 — "Ship It"):** A polished, tested, persistent tool that works great on desktop and mobile for the personal use case that inspired it (high-income earner planning a cross-state move).

**Medium-term (v1.5 — "Grow It"):** Add visualization, multi-scenario comparison, export, and light sharing capabilities so it is useful to share with others.

**Long-term (v2.0 — "Platform"):** Optional BaaS-powered cloud sync (Supabase/Firebase), a public landing page, and marketing presence. Because the app is fully static, any cloud features must use third-party BaaS — there is no custom backend server.

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
| 1 | Developer Experience & Quality | 🔴 Critical | Now |
| 2 | Persistence & User Data | 🔴 Critical | Now |
| 3 | Enhanced Tax Engine | 🟠 High | v1.0 |
| 4 | Data Visualization | 🟠 High | v1.0 |
| 5 | Advanced Budget Features | 🟡 Medium | v1.5 |
| 6 | UX Polish & Accessibility | 🟠 High | v1.0 |
| 7 | Export & Sharing | 🟡 Medium | v1.5 |
| 8 | Backend & Cloud Sync (BaaS, optional) | 🟢 Low | v2.0 |
| 9 | Growth & Discovery | 🟢 Low | v2.0 |

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

### E2-T3 · Save/load named budgets
- Allow the user to save the current budget under a custom name (stored in `localStorage` as an array of named snapshots)
- Display a "My Budgets" dropdown in the header to load any saved budget
- Allow deleting a saved budget

### E2-T4 · Custom scenario preset creation
- Allow users to save the current state as a new preset (extends the built-in presets list)
- Store custom presets in `localStorage`
- Custom presets are visually differentiated from built-in ones in the `ScenarioPresets` bar
- Allow deleting custom presets

### E2-T5 · Import / export JSON
- "Export as JSON" button: downloads `movemath-budget-YYYY-MM-DD.json`
- "Import JSON" button: parses and validates a previously exported file, replaces current inputs
- Validate schema on import; show an error if the file is incompatible

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

### E5-T3 · Homeownership mode
- Toggle: "Renter" vs "Homeowner"
- Homeowner adds: mortgage payment, property tax, HOA, home insurance, maintenance reserve
- Replace "House Down Payment Fund" with "Home Equity" tracking once in homeowner mode
- Mortgage calculator: loan amount, rate, term → monthly payment

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

### E6-T4 · Mobile form UX improvements
- Numeric keyboard for all dollar-amount inputs (`inputMode="decimal"`)
- Sticky "Dashboard" button when scrolled into the form on mobile
- Collapse/expand sections in the form with smooth animation
- Swipe gesture to toggle between form and dashboard on mobile

### E6-T5 · Form input improvements
- Currency formatting in inputs (display `$3,000` not `3000`)
- Slider support for high-frequency-adjusted fields (e.g., retirement %)
- Inline field validation (e.g., warn if rent > annual salary / 12)
- `Tab` key increments numeric inputs by $50 or user-configurable step

### E6-T6 · Animations and transitions
- Smooth number transitions when values change (count-up animation)
- Card entrance animations on initial load
- Rebalance result fade-in
- Health score gauge animation

### E6-T7 · Dark mode
- Respect `prefers-color-scheme` system preference
- Add a manual dark/light toggle in the header
- All Tailwind colors tested in dark mode

### E6-T8 · Loading state and skeleton screens
- Add a loading skeleton for the dashboard on initial hydration
- Prevent layout shift on first render

### E6-T9 · Onboarding / empty state
- First-time user sees a brief (dismissible) tooltip or walkthrough card
- Explain: what the presets are, how Auto vs Manual mode works, what field locking does
- Store "seen onboarding" in localStorage

---

## Epic 7 — Export & Sharing

**Goal:** Let users capture and share their budgets.

### E7-T1 · PDF export
- "Save as PDF" button using `window.print()` with a dedicated `@media print` stylesheet
- Alternatively, use `jsPDF` or `react-pdf` for programmatic generation
- Output: 1-page budget summary with all categories, health score, and recommendations

### E7-T2 · CSV export
- Export all budget line items and calculated totals as a CSV
- Two formats: "Monthly" and "Annual"
- Filename: `movemath-budget-YYYY-MM-DD.csv`

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

## Release Milestones

### v0.9 — "Solid Foundation" (current → next)
- Epic 1 (DX & Quality): All tasks complete
- Epic 2-T1, T2 (localStorage persistence)
- Epic 6-T1, T2, T3 (accessibility baseline)
- Bug fixes: health score type cast, scenario matching, tax year constants

### v1.0 — "Ship It"
- Epic 2 complete (persistence, named saves, import/export JSON)
- Epic 3-T1 (10+ state taxes), T2 (Roth IRA), T3 (HSA)
- Epic 4-T1 through T5 (charts: pie, bar, savings progress, health gauge)
- Epic 6 complete (full UX polish)
- Epic 7-T1, T2, T3 (PDF, CSV, share link)

### v1.5 — "Grow It"
- Epic 3 complete
- Epic 4 complete (including projection chart, rebalance diff)
- Epic 5-T1 through T4 (multi-scenario, debt payoff, homeowner mode, COLI)
- Epic 7 complete

### v2.0 — "Platform"
- Epic 5 complete
- Epic 8 complete (auth, cloud sync, history)
- Epic 9 complete (landing page, SEO, analytics)

---

## Tech Debt Register

| ID | Description | Severity | Epic Ref |
|---|---|---|---|
| TD-1 | `budgetHealthScore.ts` casts `BudgetBreakdown` to access `inputs` fields | Medium | E1-T8 |
| TD-2 | Tax year constants (401k limit, IRA limit, brackets) hardcoded to 2024 | High | E3-T6 |
| TD-3 | Scenario preset matching in `page.tsx` uses fragile field-comparison | Low | E2-T4 |
| TD-4 | No error boundaries — uncaught calculation error crashes the UI | High | E1-T9 |
| TD-5 | No tests — any refactor carries risk | Critical | E1 |
| TD-6 | `totalInvestments` in `budgetCalculations.ts` includes `extraDebtPayoff` (a debt payment, not an investment) | Medium | E3 |
| TD-7 | `BudgetFieldInput.tsx` and `BudgetSection.tsx` are defined but not fully used; `BudgetField` type in `budget.ts` is unused | Low | General |
| TD-8 | `calculateNetMonthlyIncome` treats IRA as subtracting from take-home alongside 401k, but Roth IRA is after-tax — needs to be split | Medium | E3-T2 |

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

*Last updated: 2026-06-11 — reflects codebase state at initial plan creation.*

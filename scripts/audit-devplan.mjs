#!/usr/bin/env node
/**
 * DEV_PLAN.md audit script
 *
 * Parses DEV_PLAN.md and verifies that every task in COMPLETED_TASKS is
 * marked "✅ Done" (or "✅ Partial") in its heading.  Also reports any task
 * heading that carries a ✅ but is NOT listed in COMPLETED_TASKS (stale mark).
 *
 * Exit codes:
 *   0  — all checks pass (or --report-only flag is set)
 *   1  — mismatch detected
 *
 * Usage:
 *   node scripts/audit-devplan.mjs            # strict (used in CI)
 *   node scripts/audit-devplan.mjs --report   # print report, always exit 0
 *
 * To mark a task complete:
 *   1. Add its ID to COMPLETED_TASKS below (with an optional note).
 *   2. Add "✅ Done" to the ### heading in DEV_PLAN.md.
 *   3. CI will fail if either step is missing.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLAN_PATH = join(ROOT, 'DEV_PLAN.md');

// ─── Registry of completed task IDs ──────────────────────────────────────────
// Add an entry here when a task is done.  The value is a short note (unused
// programmatically — it's just documentation for reviewers).
const COMPLETED_TASKS = {
  // Epic 1 — Developer Experience & Quality
  'E1-T1':  'jest + ts-jest setup, jest.config.ts, npm test script',
  'E1-T2':  'taxCalculations.test.ts — all bracket/rate tests',
  'E1-T3':  'budgetCalculations.test.ts — breakdown + edge cases',
  'E1-T4':  'rebalanceBudget.test.ts — strategies, surplus allocations, locks, no-mutate flow',
  'E1-T5':  'recommendations.test.ts — all recommendation IDs tested',
  'E1-T6':  'app/__tests__/page.smoke.test.tsx — page-level integration smoke test',
  'E1-T7':  '.github/workflows/ci.yml — install/lint/build/test',
  'E1-T8':  'ESLint flat config (eslint.config.mjs), strict TS in tsconfig.json',
  'E1-T9':  'components/ErrorBoundary.tsx used in app/page.tsx',
  'E1-T10': 'TAX_YEAR comments + update reminders in lib/taxCalculations.ts',

  // Epic 2 — Persistence & User Data
  'E2-T1': 'lib/storage.ts — saveBudgetInputs / loadBudgetInputs with debounce',
  'E2-T2': 'STORAGE_VERSION constant + one-time legacy-key migration',
  'E2-T3': 'NamedBudget type, saveNamedBudget/loadNamedBudgets/deleteNamedBudget, MyBudgets.tsx',
  'E2-T4': 'CustomPreset type, save/load/delete custom presets, ScenarioPresets.tsx ⭐ badge',
  'E2-T5': 'exportBudgetAsJSON / importBudgetFromJSON / triggerDownload in storage.ts; ExportImport.tsx',

  // Epic 3 — Enhanced Tax Engine
  'E3-T1': 'All 50 states + DC in stateIncomeTaxEstimate; full STATE_LABELS map',
  'E3-T2': 'iraType: traditional | roth on BudgetInputs; Traditional phase-out warnings',
  'E3-T3': 'hsaContribution + hsaEligible + maxOutHSA; 2026 limits ($4150/$8300)',
  'E3-T4': 'bonusTaxMode; lump-sum withholding vs blended annual bonus tax modeling',
  'E3-T5': 'esppIncome + rsuVestingIncome as supplemental ordinary income in calculations and UI',
  'E3-T6': '2026 federal/state brackets, ANNUAL_401K_LIMIT=$24500, catch-up contributions',

  // Epic 4 — Data Visualization
  'E4-T1': 'recharts installed; AreaChart used in debt payoff timeline + TrendChart',
  'E4-T2': 'components/BudgetPieChart.tsx — recharts donut chart with per-slice colors, hover tooltips, responsive legend',
  'E4-T3': 'components/ExpenseThresholdChart.tsx — recharts horizontal BarChart with ReferenceLine thresholds and color-coded Cell fills',
  'E4-T4': 'components/SavingsProgressCard.tsx — animated progress bars for 401k/IRA/HSA limits plus emergency-fund and house-fund timelines',
  'E4-T5': 'SVG arc gauge with strokeDasharray in components/BudgetHealthScore.tsx',
  'E4-T6': 'lib/annualProjection.ts + components/AnnualProjectionChart.tsx for 1/3/5/10-year savings projections',
  'E4-T7': 'components/RebalanceDiffChart.tsx integrated in RebalanceControls.tsx for before/after rebalance visualization',

  // Epic 5 — Advanced Budget Features
  'E5-T1': 'lib/scenarioComparison.ts + components/ScenarioComparison.tsx; side-by-side comparison',
  'E5-T2': 'lib/debtPayoff.ts; DebtPayoffTimeline card; avalanche/snowball strategy selector',
  'E5-T3': 'housingMode: renter | homeowner on BudgetInputs; all homeowner fields; homeowner-aware calcs',
  'E5-T4': 'lib/coliData.ts MERIC indices; ColiCard.tsx; COLI adjustment banner in BudgetForm',
  'E5-T5': 'payFrequency on BudgetInputs; lib/paycheckCalculations.ts; PaycheckCard.tsx',
  'E5-T6': 'incomeVariabilityPercent; lib/irregularIncome.ts P25/P50/P75; IrregularIncomeCard.tsx',
  'E5-T7': 'partnerEnabled + 8 partner fields; calculateCombinedNetMonthlyIncome; MFJ combined taxes; Partner Income section in BudgetForm; IncomeSummary household view',
  'E5-T8': 'calculateMonthsToGoal + calculateRequiredContribution helpers; monthsAtCurrentRate on LongTermGoalProjection; goal timeline UI in BudgetDashboard',
  'E5-T9': 'lib/annualExpenses.ts + decision support surfaces for sinking funds, recurring annual expenses, and planning tradeoffs',

  // Epic 6 — UX Polish & Accessibility
  'E6-T1': 'focus-visible rings on all interactive elements; Escape closes dropdowns; focus restored to trigger',
  'E6-T2': 'role="switch" dark: variants; region/status/live ARIA coverage verified',
  'E6-T3': 'text-amber-600 → text-amber-700; text-gray-400 → text-gray-500 across 10 components',
  'E6-T4': 'inputMode="decimal" on number inputs; section collapse/expand animation; mobile swipe toggle between editor and dashboard',
  'E6-T5': 'Inline field validation (rent > 50% gross warning); accessible field labels',
  'E6-T6': 'count-up transitions, card entrance animation, rebalance fade-in, and health score gauge sweep animation',
  'E6-T7': 'ThemeProvider.tsx (class strategy), DarkModeToggle, dark: Tailwind classes, localStorage persist',
  'E6-T8': 'DashboardSkeleton.tsx pulse-animated placeholder; isMounted guard in page.tsx eliminates blank-page flash',
  'E6-T9': 'components/OnboardingCard.tsx; dismiss state in localStorage',

  // Epic 7 — Export & Sharing
  'E7-T1': 'PDF export via window.print(); print-only stylesheet; ExportImport.tsx',
  'E7-T2': 'exportBudgetAsCSV in storage.ts; wired into ExportImport.tsx dropdown',
  'E7-T3': 'URL-safe Base64 ?b= payload; versioned compact encoding (v:2); app startup preload',
  'E7-T4': 'exportBudgetQuickSummary in storage.ts; Copy Summary action in ExportImport.tsx',

  // Epic 9 — Growth & Discovery
  'E9-T1': 'Shared SEO metadata helper, JSON-LD, and static-export-safe robots/sitemap routes',
  'E9-T2': 'Marketing landing page at `/`, budget planner moved to `/app`',
  'E9-T3': 'local-only aggregate analytics counters for presets, loads, rebalance runs, learn CTA clicks, and feedback submissions',
  'E9-T4': 'FeedbackWidget opens prefilled GitHub issues with optional budget-summary context',
  'E9-T5': 'app/learn/page.tsx and lib/learnContent.ts educational hub linked from the app shell',
  'E10-T1': 'all 12 core calc modules verified React/browser-free; JSDoc added to annualExpenses.ts; budgetHealthScore.test.ts + 33 new tests; 95%+ coverage',
};

// ─── Parse DEV_PLAN.md ────────────────────────────────────────────────────────

const TASK_HEADING_RE = /^###\s+(E\d+-T\d+[a-z]?)\s+·\s+(.+)$/;

function parsePlan(text) {
  const tasks = [];
  for (const line of text.split('\n')) {
    const m = line.match(TASK_HEADING_RE);
    if (!m) continue;
    const id = m[1];
    const title = m[2].trim();
    const isDone = title.includes('✅ Done') || title.includes('✅ Partial');
    tasks.push({ id, title, isDone, line: line.trimEnd() });
  }
  return tasks;
}

// ─── Run audit ────────────────────────────────────────────────────────────────

const planText = readFileSync(PLAN_PATH, 'utf-8');
const tasks = parsePlan(planText);
const reportOnly = process.argv.includes('--report') || process.argv.includes('--report-only');

const completedIds = new Set(Object.keys(COMPLETED_TASKS));
const planIds = new Set(tasks.map((t) => t.id));

const unmarked = []; // in COMPLETED_TASKS but no ✅ in DEV_PLAN heading
const stale    = []; // ✅ in DEV_PLAN but not in COMPLETED_TASKS
const ok       = []; // in both and correctly marked
const pending  = []; // not in COMPLETED_TASKS, no ✅ (expected state for not-yet-done)

for (const task of tasks) {
  if (completedIds.has(task.id)) {
    if (task.isDone) {
      ok.push(task);
    } else {
      unmarked.push(task); // Done in registry but heading not marked
    }
  } else {
    if (task.isDone) {
      stale.push(task); // Marked in plan but not registered as done
    } else {
      pending.push(task);
    }
  }
}

// Tasks in COMPLETED_TASKS that don't appear in the plan at all
const missing = [...completedIds].filter((id) => !planIds.has(id));

// ─── Report ───────────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function pad(s, n) { return s.padEnd(n); }

console.log(`\n${BOLD}DEV_PLAN.md Audit Report${RESET}`);
console.log('═'.repeat(60));
console.log(`${DIM}Plan path: ${PLAN_PATH}${RESET}\n`);

// Summary counts
console.log(`${BOLD}Summary${RESET}`);
console.log(`  ${GREEN}✅ Verified done:  ${ok.length}${RESET}`);
console.log(`  ${BLUE}🔲 Pending:         ${pending.length}${RESET}`);
console.log(`  ${RED}⚠  Unmarked done:  ${unmarked.length}${RESET}`);
console.log(`  ${YELLOW}⚠  Stale ✅ mark:   ${stale.length}${RESET}`);
if (missing.length > 0) {
  console.log(`  ${RED}✗  Missing from plan: ${missing.length}${RESET}`);
}

// Completed tasks
if (ok.length > 0) {
  console.log(`\n${BOLD}${GREEN}Verified Complete (${ok.length})${RESET}`);
  for (const t of ok) {
    console.log(`  ${GREEN}✅${RESET} ${pad(t.id, 8)} ${DIM}${COMPLETED_TASKS[t.id]}${RESET}`);
  }
}

// Pending tasks
if (pending.length > 0) {
  console.log(`\n${BOLD}${BLUE}Pending (${pending.length})${RESET}`);
  for (const t of pending) {
    const shortTitle = t.title.replace(/\s*✅.*$/, '').trim();
    console.log(`  ${BLUE}○${RESET} ${pad(t.id, 8)} ${DIM}${shortTitle.substring(0, 55)}${RESET}`);
  }
}

// Problems
if (unmarked.length > 0) {
  console.log(`\n${BOLD}${RED}ACTION REQUIRED — Unmarked in DEV_PLAN.md (${unmarked.length})${RESET}`);
  console.log(`${DIM}  These tasks are in the COMPLETED_TASKS registry but their DEV_PLAN.md`);
  console.log(`  heading is missing "✅ Done".  Add the marker to the heading.${RESET}`);
  for (const t of unmarked) {
    console.log(`  ${RED}✗${RESET} ${RED}${pad(t.id, 8)}${RESET} ${t.title.substring(0, 55)}`);
  }
}

if (stale.length > 0) {
  console.log(`\n${BOLD}${YELLOW}ACTION REQUIRED — Stale ✅ in DEV_PLAN.md (${stale.length})${RESET}`);
  console.log(`${DIM}  These headings have ✅ but are NOT in the COMPLETED_TASKS registry.`);
  console.log(`  Either add the task to COMPLETED_TASKS or remove the ✅ from the heading.${RESET}`);
  for (const t of stale) {
    console.log(`  ${YELLOW}!${RESET} ${YELLOW}${pad(t.id, 8)}${RESET} ${t.title.substring(0, 55)}`);
  }
}

if (missing.length > 0) {
  console.log(`\n${BOLD}${RED}ACTION REQUIRED — Registered but not in plan (${missing.length})${RESET}`);
  console.log(`${DIM}  These IDs are in COMPLETED_TASKS but have no matching ### heading in DEV_PLAN.md.${RESET}`);
  for (const id of missing) {
    console.log(`  ${RED}✗${RESET} ${RED}${id}${RESET}`);
  }
}

console.log('\n' + '═'.repeat(60));

const hasIssues = unmarked.length + stale.length + missing.length > 0;
if (hasIssues) {
  console.log(`${RED}${BOLD}Audit FAILED — ${unmarked.length + stale.length + missing.length} issue(s) found.${RESET}`);
  console.log(`${DIM}Run with --report to suppress exit code 1.${RESET}\n`);
  if (!reportOnly) process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}Audit PASSED ✓${RESET}\n`);
}

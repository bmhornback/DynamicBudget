# DynamicBudget MCP Tool Reference

> **Status:** E10-T2 complete — schemas defined, ready for E10-T3 (server implementation).

This document is the authoritative reference for the five MCP tools exposed by DynamicBudget. It covers tool purposes, input/output contracts, validation rules, example prompts, and the error handling strategy.

---

## Table of Contents

1. [Overview](#overview)
2. [Common Types](#common-types)
3. [Tools](#tools)
   - [calculate_monthly_budget](#calculate_monthly_budget)
   - [analyze_state_move](#analyze_state_move)
   - [calculate_retirement_savings](#calculate_retirement_savings)
   - [get_recommendations](#get_recommendations)
   - [compare_scenarios](#compare_scenarios)
4. [Validation Rules](#validation-rules)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Example AI Prompts](#example-ai-prompts)

---

## Overview

DynamicBudget's MCP server exposes five budget calculation tools that AI assistants (Claude, ChatGPT, etc.) can call to answer personal finance questions in real time. All tools are **stateless** — each call is self-contained and does not depend on prior calls.

The tools are backed by the same calculation engine used in the DynamicBudget web app (`lib/budgetCalculations.ts`, `lib/taxCalculations.ts`, and related modules).

| Tool | Core Function | Minimum Required Inputs |
|------|---------------|------------------------|
| `calculate_monthly_budget` | Full budget breakdown | `salary`, `state` |
| `analyze_state_move` | State relocation impact | `current_state`, `target_state`, `salary` |
| `calculate_retirement_savings` | Retirement projection | `salary`, `age`, `years_to_retirement` |
| `get_recommendations` | Financial advice | `salary`, `state` |
| `compare_scenarios` | Side-by-side comparison | `scenarios` (2–4 items, each with `salary` + `state`) |

---

## Common Types

### FilingStatus
```
"single" | "married_jointly" | "head_of_household"
```
Default: `"single"`

### StateOfResidence
Any two-letter US state abbreviation (`"AL"` through `"WY"`) plus `"DC"` and `"no_state_tax"`.

Use `"no_state_tax"` when you want to model a state with no income tax generically, or when the specific state is unknown. States with no income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY) can be specified by their abbreviation — the tax engine will correctly apply $0 state income tax.

### HousingMode
```
"renter" | "homeowner"
```
Default: `"renter"`

### IRAType
```
"traditional" | "roth"
```
Default: `"traditional"`

---

## Tools

---

### calculate_monthly_budget

**Purpose:** Calculates a complete monthly budget breakdown for a given salary, location, expenses, and savings configuration.

**Schema:** [`schemas/calculate_monthly_budget.schema.json`](schemas/calculate_monthly_budget.schema.json)
**Example:** [`examples/calculate_monthly_budget.example.json`](examples/calculate_monthly_budget.example.json)

#### Required inputs
| Field | Type | Description |
|-------|------|-------------|
| `salary` | number | Annual gross salary in USD |
| `state` | StateOfResidence | State of residence |

#### Optional inputs
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filing_status` | FilingStatus | `"single"` | Federal filing status |
| `age` | integer | `30` | Age in years (affects catch-up contribution eligibility) |
| `housing_mode` | HousingMode | `"renter"` | Renter or homeowner |
| `expenses` | object | `{}` | Monthly expense amounts in USD |
| `savings` | object | `{}` | Savings and investment configuration |

#### Key output fields
| Field | Type | Description |
|-------|------|-------------|
| `gross_monthly` | number | Monthly gross income |
| `net_monthly_income` | number | Monthly take-home after taxes and pre-tax deductions |
| `taxes` | object | Federal, state, and FICA breakdown |
| `expense_totals` | object | Categorized expense totals |
| `remaining_monthly_buffer` | number | Unallocated dollars (positive = surplus) |
| `is_over_budget` | boolean | True when expenses exceed net income |
| `savings_rate_gross` | number | Savings as fraction of gross income (0–1) |
| `emergency_fund_target` | number | Recommended emergency fund balance |

---

### analyze_state_move

**Purpose:** Analyzes the financial impact of relocating from one US state to another. Compares state income taxes, cost-of-living indices (MERIC), and net take-home pay.

**Schema:** [`schemas/analyze_state_move.schema.json`](schemas/analyze_state_move.schema.json)
**Example:** [`examples/analyze_state_move.example.json`](examples/analyze_state_move.example.json)

#### Required inputs
| Field | Type | Description |
|-------|------|-------------|
| `current_state` | StateOfResidence | Current state of residence |
| `target_state` | StateOfResidence | Prospective new state |
| `salary` | number | Annual gross salary in USD |

#### Optional inputs
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filing_status` | FilingStatus | `"single"` | Federal filing status |
| `age` | integer | `30` | User age |
| `retirement_contribution_percent` | number | `6` | 401(k) contribution % (affects pre-tax deductions for tax calc) |

#### Key output fields
| Field | Type | Description |
|-------|------|-------------|
| `current_state` / `target_state` | object | COLI index, tier, annual/monthly state tax, and net monthly income for each state |
| `tax_impact` | object | Annual and monthly state tax delta, net income delta |
| `coli_impact` | object | COLI indices, percent change, purchasing power equivalent salary |
| `summary` | string | One-sentence human-readable summary |
| `recommendations` | array | Actionable recommendations for the move |

---

### calculate_retirement_savings

**Purpose:** Calculates 401(k) and IRA contribution amounts, employer match, catch-up eligibility, tax implications, and a projected retirement balance with compound growth.

**Schema:** [`schemas/calculate_retirement_savings.schema.json`](schemas/calculate_retirement_savings.schema.json)
**Example:** [`examples/calculate_retirement_savings.example.json`](examples/calculate_retirement_savings.example.json)

#### Required inputs
| Field | Type | Description |
|-------|------|-------------|
| `salary` | number | Annual gross salary in USD |
| `age` | integer | Current age (affects catch-up eligibility and projection start) |
| `years_to_retirement` | integer | Years until planned retirement (1–50) |

#### Optional inputs
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `filing_status` | FilingStatus | `"single"` | Filing status (affects IRA phase-out thresholds) |
| `state` | StateOfResidence | `"no_state_tax"` | State (used for net income context) |
| `contribution_percent` | number | `6` | 401(k) contribution % of gross salary |
| `max_out_401k` | boolean | `false` | Automatically contribute the IRS annual max |
| `is_401k_roth` | boolean | `false` | Treat 401(k) as Roth (after-tax) |
| `employer_match_percent` | number | `0` | Employer match % of gross salary |
| `employer_match_cap_percent` | number | `100` | Cap on employer match % |
| `ira_contribution` | number | `0` | Annual IRA contribution in USD |
| `ira_type` | IRAType | `"traditional"` | IRA type |
| `assumed_annual_return` | number | `0.07` | Assumed average annual return (0–0.30) |
| `existing_retirement_balance` | number | `0` | Current retirement account balance |

#### Key output fields
| Field | Type | Description |
|-------|------|-------------|
| `contributions` | object | Monthly/annual 401k, IRA, employer match, totals, catch-up eligibility |
| `tax_implications` | object | Pre-tax deduction amount, federal tax savings, IRA deductibility status |
| `projection` | object | Projected balance at retirement, monthly income (4% rule), assumptions |
| `recommendations` | array | Retirement-specific financial advice |

**2026 IRS limits used by the calculation engine:**
- 401(k): $24,500 ($32,000 with catch-up age 50+)
- IRA: $7,000 ($8,000 with catch-up age 50+)
- HSA (self-only): $4,150 | HSA (family): $8,300

**Traditional IRA deductibility phase-outs (2026):**
- Single / covered by workplace plan: $77,000–$87,000
- Married filing jointly / covered by workplace plan: $123,000–$143,000

---

### get_recommendations

**Purpose:** Generates a prioritized list of financial recommendations based on a user's budget profile. Analyzes housing ratio, savings rate, emergency fund coverage, retirement participation, and debt burden.

**Schema:** [`schemas/get_recommendations.schema.json`](schemas/get_recommendations.schema.json)
**Example:** [`examples/get_recommendations.example.json`](examples/get_recommendations.example.json)

#### Required inputs
| Field | Type | Description |
|-------|------|-------------|
| `salary` | number | Annual gross salary in USD |
| `state` | StateOfResidence | State of residence |

#### Optional inputs
All other fields are optional expense and savings amounts. The more detail provided, the more specific and actionable the recommendations will be.

#### Key output fields
| Field | Type | Description |
|-------|------|-------------|
| `recommendations` | array | Prioritized recommendations with `id`, `severity` (`warning`/`info`/`success`), and `message` |
| `health_score` | object | Overall score (0–100), label, and sub-scores by dimension |
| `budget_summary` | object | Net income, total allocated, buffer, over-budget flag, key rates |

**Recommendation severity levels:**
- `warning` — Action recommended; a financial risk is present
- `info` — Suggestion to optimize or improve
- `success` — Goal is being met; positive reinforcement

---

### compare_scenarios

**Purpose:** Compares 2–4 named budget scenarios side by side. Returns individual breakdowns, a diff table vs. the baseline (first scenario), a winner, and narrative insights.

**Schema:** [`schemas/compare_scenarios.schema.json`](schemas/compare_scenarios.schema.json)
**Example:** [`examples/compare_scenarios.example.json`](examples/compare_scenarios.example.json)

#### Required inputs
| Field | Type | Description |
|-------|------|-------------|
| `scenarios` | array | 2–4 scenario objects, each with at least `name`, `salary`, and `state` |

Each scenario object accepts the same optional fields as `calculate_monthly_budget` plus a `name` (required, max 80 chars) and optional `description` (max 300 chars).

#### Key output fields
| Field | Type | Description |
|-------|------|-------------|
| `scenarios` | array | Full budget breakdown per scenario |
| `diffs` | array | Delta vs. baseline per non-baseline scenario |
| `winner` | object | Highest health-score scenario with one-sentence rationale |
| `insights` | array | Narrative observations about tradeoffs between scenarios |

---

## Validation Rules

These rules apply to all tools. The MCP server **must** validate inputs against these rules before calling the calculation engine, and return a structured error for any violation.

### Salary
- Must be a positive number: `salary > 0`
- Maximum enforced at `10,000,000` to prevent overflow in tax tables
- Must be finite (no `Infinity` or `NaN`)

### State
- Must be one of the 51 `StateOfResidence` enum values (including `"DC"` and `"no_state_tax"`)
- Case-sensitive: use uppercase abbreviations (`"TX"`, not `"tx"`)

### Age
- Integer: `18 ≤ age ≤ 99`
- Values below 18 are rejected (no minor financial modeling)
- Values above 99 are rejected

### Filing Status
- Must be one of: `"single"`, `"married_jointly"`, `"head_of_household"`

### Contribution Percentages
- Range: `0 ≤ value ≤ 100`
- Fractional values allowed (e.g., `6.5`)

### IRA Contribution
- Must be `≥ 0`
- The server will clamp to the IRS annual limit automatically (does not error — instead warns in recommendations)

### Annual Return (calculate_retirement_savings)
- Range: `0 ≤ assumed_annual_return ≤ 0.30`
- Values above 0.30 (30%) are rejected as unrealistic

### Years to Retirement
- Integer: `1 ≤ years_to_retirement ≤ 50`

### Scenarios Array (compare_scenarios)
- Must contain `2–4` items
- Each item must have `name` (string, 1–80 chars), `salary`, and `state`
- `current_state` and `target_state` must differ (analyze_state_move only); if equal, the server returns a `same_state` error

### Monetary Amounts (expense fields)
- Must be `≥ 0`
- NaN and Infinity are rejected
- No hard upper limit — intentionally allows modeling unusual high-cost situations

---

## Error Handling Strategy

The MCP server returns structured errors in all failure cases. Errors are never surfaced as unhandled exceptions.

### Error Response Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of what went wrong.",
    "field": "salary",
    "details": {
      "received": -5000,
      "constraint": "salary must be > 0"
    }
  }
}
```

### Error Codes

| Code | HTTP Analogy | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input failed schema validation (wrong type, out of range, missing required field). |
| `SAME_STATE_ERROR` | 400 | `analyze_state_move` called with `current_state === target_state`. |
| `TOO_FEW_SCENARIOS` | 400 | `compare_scenarios` received fewer than 2 scenarios. |
| `TOO_MANY_SCENARIOS` | 400 | `compare_scenarios` received more than 4 scenarios. |
| `UNKNOWN_TOOL` | 404 | The requested tool name does not exist. |
| `CALCULATION_ERROR` | 500 | Unexpected error in the calculation engine (should be extremely rare given client-side validation). |

### Validation Priority

Errors are returned for the **first** failing field in the following priority order:
1. Missing required fields
2. Type errors (string vs. number)
3. Enum constraint violations (invalid state, filing status, etc.)
4. Range constraint violations (salary, age, contribution %)
5. Cross-field constraints (e.g., `current_state === target_state`)

### Partial Input Tolerance

Tools with many optional fields are designed to be **tolerant of sparse inputs**. Omitted optional expense and savings fields default to `0` or the documented default value — they do not produce errors. This allows AI assistants to call tools with minimal context and receive useful (if simplified) results.

### Clamping vs. Erroring

Certain inputs are silently **clamped** rather than rejected to provide better AI assistant UX:
- IRA contribution exceeding the IRS annual limit → clamped to the limit; a `recommendations` entry notes the cap
- `employer_match_cap_percent` > 100 → clamped to 100

All clamping is noted in the `recommendations` array of the response.

---

## Example AI Prompts

The following prompts demonstrate how an AI assistant might invoke each tool.

### calculate_monthly_budget
> "What's my take-home pay and budget breakdown if I earn $110k in Seattle, WA, pay $1,900/month rent, and contribute 8% to my 401(k)?"

### analyze_state_move
> "I'm thinking about moving from New York to Florida. I make $135k. How much would I save in state taxes and what's the cost-of-living difference?"

> "What's my net monthly income if I move to Texas earning $150k?"

### calculate_retirement_savings
> "I'm 42, earning $88k in Georgia, contributing 5% to my 401(k) with a 3% employer match. Should I max out my IRA? What will I have at retirement in 23 years?"

> "Should I max out my 401k at my current income level?"

### get_recommendations
> "I make $70k in Chicago, pay $1,400/month rent, and haven't started a 401(k). What should I do first?"

### compare_scenarios
> "Compare my current budget in San Francisco ($120k, $2,800 rent) vs. moving to Austin at the same salary vs. taking a $96k job in Austin."

> "Compare my current budget with these three savings scenarios: 6% 401k, 10% 401k, and maxing out my 401k."

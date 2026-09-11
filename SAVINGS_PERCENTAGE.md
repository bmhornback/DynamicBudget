# Percentage-Based Savings Feature

## Overview

The Percentage-Based Savings feature allows users to set savings goals as a percentage of their **net income** instead of fixed dollar amounts. This enables more flexible, dynamic savings planning where the target savings amount automatically adjusts as income changes.

## Key Concepts

### Two Savings Modes

The app now supports two distinct savings planning modes:

#### 1. **Fixed Amount Mode** (Traditional)
- Specify exact dollar amounts for each savings category:
  - Emergency Fund Contribution
  - House Down Payment Contribution
  - Taxable Investments
  - General Cash Savings
  - Extra Debt Payoff
- IRA remains a separate retirement input and is not affected by the savings-mode toggle
- Use this mode when you have specific, known savings targets
- Example: "Save $1,500/month for emergency fund"

#### 2. **Percentage of Net Income Mode** (New)
- Set a single percentage target (0-50%) of your **net monthly income**
- The app automatically calculates the exact dollar amount based on your actual take-home pay
- Automatically recalculates when income changes
- Use this mode for proportional savings targets
- Example: "Save 30% of my take-home pay"

### How Percentage Mode Works

When **Percentage Mode** is enabled:

1. The app calculates your **net monthly income** (after all taxes, 401k, IRA)
2. Your target savings = `net monthly income × (savings percentage / 100)`
3. This calculated amount appears in the budget breakdown as **"Calculated Savings from Percentage"**
4. Emergency Fund, House Down Payment, Taxable Investments, General Cash Savings, and Extra Debt Payoff are **automatically locked** to prevent accidental changes

**Example:**
- Annual salary: $150,000
- After-tax monthly take-home: $8,500
- Percentage savings target: 30%
- Calculated monthly savings: $8,500 × 0.30 = $2,550

## User Journey

### Switching Between Modes

#### To Enable Percentage Mode:
1. Navigate to the **Savings & Investing** section in the budget form
2. Toggle the switch labeled **"Use Percentage-Based Savings"** to **ON**
3. A slider appears showing the percentage (default 30%)
4. Individual savings fields automatically hide
5. Emergency Fund, House Down Payment, Taxable Investments, General Cash Savings, and Extra Debt Payoff are automatically locked to protect them

#### To Adjust Percentage:
1. With percentage mode enabled, use the **Percentage Slider** (0-50%)
2. Watch the **"Calculated Savings from Percentage"** value update in real-time
3. The budget breakdown recalculates instantly

#### To Switch Back to Fixed Amounts:
1. Toggle the **"Use Percentage-Based Savings"** switch to **OFF**
2. Individual savings fields automatically unlock
3. Individual savings fields reappear
4. Return to entering specific dollar amounts

### Viewing Results

In the **Savings Summary** section:

**When in Percentage Mode:**
- Shows: "Savings (Y% of net income)" with the calculated monthly and annual amounts
- Displays the calculated dollar amount prominently
- Individual field breakdown is hidden

**When in Fixed Amount Mode:**
- Shows: Detailed breakdown of all savings categories
- Total Savings (sum of emergency fund, house fund, cash savings)
- House Fund, Taxable Investments, Other Investments as separate rows
- Plus IRA/401k contributions above the line

## Integration with Budget Features

### Rebalancing Engine

When in percentage mode:
- The percentage-based savings amount is treated as a **priority constraint**
- The rebalancing engine optimizes remaining expenses around this savings target
- The "Save X% of Net Income" amount does not get rebalanced—it stays fixed

### Dynamic Income Changes

Percentage-based savings automatically adjusts when:
- Gross income changes
- Tax situation changes (state, filing status, etc.)
- 401k contribution changes
- Any factor affecting net income changes

**Example:** If you increase your 401k contribution, your net income decreases, so your percentage-based savings target automatically recalculates downward.

### Field Locking

When you enable percentage mode:
- Emergency Fund, House Down Payment, Taxable Investments, General Cash Savings, and Extra Debt Payoff fields are **automatically locked**
- This prevents the rebalancing engine from modifying these fields
- It prevents accidental user changes while in percentage mode
- When you disable percentage mode, those fields return to their prior lock state

## Use Cases

### Use Percentage Mode When:
- ✅ Your savings target is proportional to income (e.g., "30% of take-home")
- ✅ You're changing jobs and want savings to scale with new income
- ✅ You want automatic recalculation when tax situation changes
- ✅ You prefer a simple, single savings percentage rather than multiple buckets

### Use Fixed Amount Mode When:
- ✅ You have specific savings goals (e.g., "$50k for house down payment")
- ✅ You want to save different amounts for different buckets
- ✅ You need fine-grained control over each savings category
- ✅ Your savings targets are independent of income fluctuations

## Technical Implementation

### Type Definitions
- `BudgetInputs.isSavingsByPercentage: boolean` — Toggle for mode
- `BudgetInputs.savingsPercentOfNetIncome: number` — Percentage value (0-50)
- `BudgetBreakdown.calculatedSavingsFromPercentage: number` — Calculated monthly amount

### Calculation Logic
In `lib/budgetCalculations.ts`:
```typescript
if (inputs.isSavingsByPercentage) {
  calculatedSavingsFromPercentage = netMonthlyIncome * (inputs.savingsPercentOfNetIncome / 100);
  totalSavings = calculatedSavingsFromPercentage;
} else {
  totalSavings = emergencyFundContribution + houseDownPaymentContribution + generalCashSavings;
}
```

### UI Components
- `BudgetForm.tsx`: Toggle switch and percentage slider
- `SavingsSummary.tsx`: Displays mode-specific savings breakdown
- `app/page.tsx`: Auto-lock/unlock logic

## Examples

### Scenario 1: New Job with Salary Change
- **Old job:** $120k salary → $6,500 net/month → save 25% = $1,625/month
- **New job:** $150k salary → $8,500 net/month → save 25% = $2,125/month
- **Result:** Savings automatically increased by $500/month without you changing anything

### Scenario 2: Adjusting Tax Withholding
- **Before:** Save 30% of $7,000 net = $2,100/month
- **Action:** Reduce 401k contribution (more take-home)
- **After:** Net becomes $7,500 → save 30% = $2,250/month
- **Result:** Savings automatically increased to match higher net income

## Known Limitations & Future Enhancements

### Current Limitations:
- Percentage mode treats all savings as a single bucket (no split between emergency/house/cash)
- Percentages are capped at 50% (to prevent unrealistic scenarios)
- No historical tracking of percentage-based vs. fixed-mode usage

### Future Enhancements:
- Split percentage-based savings across multiple buckets (e.g., "20% emergency, 10% house")
- Add "savings rate benchmarks" (median, percentile comparisons)
- Export savings projections when switching between jobs
- Multi-year savings tracking in percentage mode

## FAQ

**Q: If I'm in percentage mode and enable field locking, what happens?**  
A: Field locking in the app protects individual fields from being rebalanced. In percentage mode, individual fields are already locked automatically, so additional locking won't have extra effect.

**Q: Can I save less than 1% or more than 50%?**  
A: The slider is capped at 0-50%. If you need different ranges, you can edit the code in `BudgetForm.tsx` (search for `NumberSlider` component).

**Q: What happens to my individual savings amounts when I switch to percentage mode?**  
A: Individual amounts are preserved in the data but ignored in calculations. When you switch back to fixed mode, they reappear unchanged.

**Q: Does percentage-based savings count as "investable" in the budget health score?**  
A: Yes, all savings (fixed or percentage-based) are counted the same way in the health score calculation.

**Q: Can I use percentage mode with the rebalancing engine?**  
A: Yes! Percentage-based savings is treated as a priority constraint in rebalancing. The engine optimizes other expense categories around your percentage target.

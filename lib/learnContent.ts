export interface LearnGuide {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const LEARN_GUIDES: LearnGuide[] = [
  {
    id: 'rent-rule',
    title: 'How much should rent cost?',
    summary: 'Use housing as a constraint, not just a wish list. DynamicBudget already flags when rent or mortgage climbs past healthy ranges.',
    bullets: [
      'Start with take-home affordability, not only gross-income rules.',
      'Model renter and homeowner versions side by side before committing.',
      'If housing is tight, protect emergency savings before increasing lifestyle spend.',
    ],
    cta: 'Compare housing scenarios in the planner.',
  },
  {
    id: 'fifty-thirty-twenty',
    title: 'When does the 50/30/20 rule help?',
    summary: 'The classic split is a sanity check, not a hard law. High-cost metros, debt payoff, or aggressive savings goals often require a different mix.',
    bullets: [
      'Treat the rule as a benchmark for needs, wants, and savings.',
      'Use your current buffer and health score to see if your version is sustainable.',
      'Adjust for goals, taxes, and location instead of forcing the percentages.',
    ],
    cta: 'Use the dashboard totals as your custom rule-of-thumb.',
  },
  {
    id: 'retirement-rate',
    title: 'How should you pick a 401(k) contribution rate?',
    summary: 'Employer match, tax treatment, and upcoming goals all matter. The planner already shows how each change affects take-home pay.',
    bullets: [
      'Capture employer match first whenever possible.',
      'Increase contributions gradually until the budget buffer becomes uncomfortably thin.',
      'Use Roth vs Traditional settings to compare current cash flow and tax treatment.',
    ],
    cta: 'Try multiple savings rates and review the paycheck card.',
  },
  {
    id: 'coli',
    title: 'How do you compare cost of living moves?',
    summary: 'Salary alone is misleading. Budgeting the same lifestyle across two states is the best way to see whether a move really helps.',
    bullets: [
      'Compare salary, taxes, housing, and discretionary categories together.',
      'Use saved-budget comparisons to preserve assumptions for each city.',
      'Review the COLI card and the remaining monthly buffer, not only gross pay.',
    ],
    cta: 'Save one budget per city, then compare them.',
  },
];

export const LEARN_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Take-home pay',
    definition: 'Income left after taxes and payroll deductions are taken out.',
  },
  {
    term: 'Commission income',
    definition: 'Variable pay earned from sales or performance, usually on top of base salary.',
  },
  {
    term: 'ESPP income',
    definition: 'Employee Stock Purchase Plan gains from buying company stock at a discount.',
  },
  {
    term: 'RSU vesting income',
    definition: 'Stock compensation that becomes yours and taxable when shares vest.',
  },
  {
    term: 'Employer match',
    definition: 'Company retirement contribution based on your own 401(k) contribution rate.',
  },
  {
    term: '401(k)',
    definition: 'Employer-sponsored retirement account that lets you save from payroll contributions.',
  },
  {
    term: 'IRA',
    definition: 'Individual Retirement Account that you contribute to outside your employer plan.',
  },
  {
    term: 'HSA',
    definition: 'Health Savings Account for eligible high-deductible health plans, with tax advantages.',
  },
  {
    term: 'Roth contribution',
    definition: 'After-tax contribution now, with typically tax-free qualified withdrawals in retirement.',
  },
  {
    term: 'Traditional contribution',
    definition: 'Pre-tax contribution that lowers taxable income now, taxed when withdrawn later.',
  },
  {
    term: 'Catch-up contributions',
    definition: 'Extra retirement contributions allowed after age 50 above standard annual limits.',
  },
  {
    term: 'Tax withholding',
    definition: 'Taxes taken from each paycheck before you receive the remaining pay.',
  },
  {
    term: 'Blended bonus tax rate',
    definition: 'Model that combines flat supplemental withholding with annual tax reconciliation effects.',
  },
  {
    term: 'COLI',
    definition: 'Cost of Living Index; compares how expensive one location is versus another.',
  },
  {
    term: 'HOA',
    definition: 'Homeowners Association fee for shared building/community maintenance and services.',
  },
  {
    term: 'P25 / P50 / P75',
    definition: 'Percentile scenarios used for income variability: bad month, typical month, and good month.',
  },
];

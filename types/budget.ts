// Core budget types for DynamicBudget

export type FilingStatus = 'single' | 'married_jointly' | 'head_of_household';

export type StateOfResidence =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'DC'
  | 'FL' | 'GA' | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY'
  | 'LA' | 'ME' | 'MD' | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT'
  | 'NE' | 'NV' | 'NH' | 'NJ' | 'NM' | 'NY' | 'NC' | 'ND' | 'OH'
  | 'OK' | 'OR' | 'PA' | 'RI' | 'SC' | 'SD' | 'TN' | 'TX' | 'UT'
  | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'no_state_tax';

export type CarSituation = 'owned_outright' | 'car_loan' | 'car_lease' | 'no_car';

export type BudgetCategory =
  | 'income'
  | 'taxes'
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'pets'
  | 'groceries'
  | 'health'
  | 'retirement'
  | 'savings'
  | 'investing'
  | 'debt'
  | 'lifestyle'
  | 'buffer';

export type RebalanceStrategy =
  | 'reduce_lifestyle_first'
  | 'reduce_investments_first'
  | 'reduce_house_fund_first'
  | 'reduce_flexible_proportionally'
  | 'reduce_non_required_proportionally'
  | 'recommendations_only';

export type SurplusAllocation =
  | 'house_fund'
  | 'emergency_fund'
  | 'taxable_investments'
  | 'lifestyle'
  | 'debt_payoff'
  | 'evenly_unlocked_savings'
  | 'leave_as_buffer';

export type BudgetMode = 'manual' | 'auto';
export type HousingMode = 'renter' | 'homeowner';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export type IRAType = 'traditional' | 'roth';
export type LongTermGoalCategory =
  | 'house'
  | 'vacation'
  | 'retirement'
  | 'kids'
  | 'major_purchase'
  | 'custom';

export type DebtPayoffStrategy = 'avalanche' | 'snowball';

export interface DebtAccount {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // annual percentage rate
  minimumPayment: number;
}

export interface LongTermSavingsGoal {
  id: string;
  name: string;
  category: LongTermGoalCategory;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM, or empty string for no deadline
}

export interface LongTermGoalProjection {
  id: string;
  name: string;
  category: LongTermGoalCategory;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  targetDate: string;
  monthsRemaining: number | null;
  requiredMonthlySavings: number;
  currentMonthlyFunding: number;
  progress: number;
  isOnTrack: boolean;
  fundingSourceLabel: string;
  status: 'funded' | 'on_track' | 'behind' | 'no_deadline' | 'past_due';
}

export interface FinancialLiteracyInsight {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface BudgetField {
  id: string;
  value: number;
  label: string;
  category: BudgetCategory;
  isLocked: boolean;
  isRequired: boolean;
  isFlexible: boolean;
  minValue: number;
  maxValue?: number;
  recommendedValue?: number;
  description?: string;
}

export interface TaxBreakdown {
  /** Annual gross salary */
  grossAnnual: number;
  /** Monthly gross income */
  grossMonthly: number;
  /** Annual federal income tax estimate */
  federalAnnual: number;
  /** Monthly federal income tax */
  federalMonthly: number;
  /** Annual state income tax estimate */
  stateAnnual: number;
  /** Monthly state income tax */
  stateMonthly: number;
  /** Annual payroll taxes (SS + Medicare) */
  payrollAnnual: number;
  /** Monthly payroll taxes */
  payrollMonthly: number;
  /** Total annual taxes */
  totalTaxAnnual: number;
  /** Total monthly taxes */
  totalTaxMonthly: number;
  /** Effective total tax rate */
  effectiveTaxRate: number;
}

export interface RetirementBreakdown {
  /** Monthly 401(k) employee contribution */
  monthly401k: number;
  /** Annual 401(k) employee contribution */
  annual401k: number;
  /** Type of 401k: traditional (pre-tax) or roth (after-tax) */
  is401kRoth: boolean;
  /** Whether contribution maxes out the 401(k) */
  isMaxing401k: boolean;
  /** Monthly 401k catch-up contribution (age 50+) */
  monthly401kCatchUp: number;
  /** Annual 401k catch-up contribution (age 50+) */
  annual401kCatchUp: number;
  /** Monthly employer match */
  monthlyEmployerMatch: number;
  /** Annual employer match */
  annualEmployerMatch: number;
  /** Capped employer match amount (actual cap applied) */
  monthlyEmployerMatchCapped: number;
  /** Annual capped employer match */
  annualEmployerMatchCapped: number;
  /** Monthly IRA contribution */
  monthlyIRA: number;
  /** Annual IRA contribution */
  annualIRA: number;
  /** Type of IRA: traditional (pre-tax) or roth (after-tax) */
  iraType: IRAType;
  /** Whether IRA contribution maxes out the limit */
  isMaxingIRA: boolean;
  /** Monthly IRA catch-up contribution (age 50+) */
  monthlyIRACatchUp: number;
  /** Annual IRA catch-up contribution (age 50+) */
  annualIRACatchUp: number;
  /** Monthly HSA contribution (if eligible) */
  monthlyHSA: number;
  /** Annual HSA contribution (if eligible) */
  annualHSA: number;
  /** Whether HSA contribution maxes out the limit */
  isMaxingHSA: boolean;
  /** Total monthly retirement savings (employee only, excludes Roth IRA and Roth 401k) */
  totalMonthlyEmployee: number;
  /** Total annual retirement savings (employee only, excludes Roth IRA and Roth 401k) */
  totalAnnualEmployee: number;
  /** Retirement savings rate as % of gross */
  retirementSavingsRate: number;
  /** Whether saving at least 15% for retirement */
  isSaving15Percent: boolean;
}

export interface BudgetInputs {
  // Income
  annualSalary: number;
  state: StateOfResidence;
  filingStatus: FilingStatus;
  retirementContributionPercent: number;
  is401kRoth: boolean; // Whether 401k is Roth (after-tax) vs Traditional (pre-tax)
  maxOut401k: boolean;
  employerMatchPercent: number;
  employerMatchCapPercent: number; // Cap on employer match (default 100%)
  userAge: number; // User's current age (0 = not specified; 50+ eligible for catch-up)
  bonusIncome: number;
  otherMonthlyIncome: number;
  /** Monthly income variability as a percentage (0 = stable salary, 20 = ±20% swings). Used for P25/P50/P75 scenario analysis. */
  incomeVariabilityPercent: number;

  // Housing
  housingMode: HousingMode;
  rent: number;
  petRent: number;
  rentersInsurance: number;
  mortgagePayment: number;
  propertyTax: number;
  homeInsurance: number;
  homeMaintenanceReserve: number;
  parkingFee: number;
  hoaFee: number;

  // Utilities
  electric: number;
  gas: number;
  water: number;
  trash: number;
  internet: number;
  phone: number;

  // Transportation
  carSituation: CarSituation;
  carPayment: number;
  fuel: number;
  carInsurance: number;
  carMaintenance: number;
  carParking: number;
  tolls: number;
  rideShareTransit: number;

  // Pets
  petsEnabled: boolean;
  numberOfPets: number;
  petFood: number;
  vetMedications: number;
  petInsurance: number;
  groomingSupplies: number;
  dogDaycare: number;
  boardingSitter: number;
  emergencyPetFund: number;

  // Food & household
  groceries: number;
  householdBasics: number;
  diningOut: number;

  // Health
  healthInsurance: number;
  prescriptions: number;
  gymFitness: number;
  therapyWellness: number;

  // Savings & investing
  emergencyFundContribution: number;
  emergencyFundTarget: number;
  houseDownPaymentContribution: number;
  houseDownPaymentTarget: number;
  taxableInvestments: number;
  iraContribution: number;
  iraType: IRAType; // 'traditional' or 'roth'
  maxOutIRA: boolean; // Checkbox to maximize IRA contribution
  hsaContribution: number; // HSA contribution (if eligible)
  hsaEligible: boolean; // Is user eligible for HSA?
  maxOutHSA: boolean; // Checkbox to maximize HSA contribution
  extraDebtPayoff: number;
  debtPayoffStrategy: DebtPayoffStrategy;
  debts: DebtAccount[];
  generalCashSavings: number;
  
  // Savings mode: percentage vs. fixed amounts
  isSavingsByPercentage: boolean;
  savingsPercentOfNetIncome: number; // e.g., 30 for 30% of net income
  longTermGoals: LongTermSavingsGoal[];

  // Lifestyle
  funEntertainment: number;
  travel: number;
  clothes: number;
  subscriptions: number;
  personalSpending: number;
  gifts: number;
  miscBuffer: number;

  // Lock states (keyed by field id)
  lockedFields: Record<string, boolean>;

  // App mode
  budgetMode: BudgetMode;
  rebalanceStrategy: RebalanceStrategy;
  surplusAllocation: SurplusAllocation;
  payFrequency: PayFrequency;

  // Partner / dual-income mode (E5-T7)
  // Enabled when filingStatus === 'married_jointly' and the user opts in.
  partnerEnabled: boolean;
  partnerAnnualSalary: number;
  partnerBonusIncome: number;
  partnerRetirementContributionPercent: number;
  partnerIs401kRoth: boolean;
  partnerMaxOut401k: boolean;
  partnerEmployerMatchPercent: number;
  partnerEmployerMatchCapPercent: number;
  partnerAge: number;

  // Spending history for trend tracking
  spendingHistory?: SpendingHistory;
}

export interface BudgetBreakdown {
  // Income
  grossMonthly: number;
  netMonthlyIncome: number;

  // Tax breakdown
  taxes: TaxBreakdown;

  // Retirement
  retirement: RetirementBreakdown;

  // Expense totals
  totalHousing: number;
  totalUtilities: number;
  totalTransportation: number;
  totalPets: number;
  totalGroceriesFood: number;
  totalHealth: number;
  totalLifestyle: number;

  // Savings totals
  totalSavings: number;
  totalInvestments: number;
  totalDebtPayoff: number;
  calculatedSavingsFromPercentage: number; // Monthly savings when isSavingsByPercentage is enabled
  effectiveEmergencyFundContribution: number;
  effectiveHouseDownPaymentContribution: number;
  monthlyRothIRA: number; // Roth IRA (after-tax contribution)
  monthlyHSA: number; // HSA (pre-tax contribution)

  // Summary totals
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalAllocated: number;

  // Buffer
  remainingMonthlyBuffer: number;

  // Annual projections
  annualHouseFund: number;
  annualTaxableInvestments: number;
  totalAnnualSavingsIncludingRetirement: number;

  // Rates
  savingsRateGross: number;
  savingsRateNet: number;
  primaryHousingPaymentAsPercentGross: number;
  primaryHousingPaymentAsPercentTakeHome: number;
  petCostsAsPercentTakeHome: number;
  carCostsAsPercentTakeHome: number;

  // Emergency fund
  essentialExpensesMonthly: number;
  emergencyFundTargetCalculated: number;

  // Status
  isOverBudget: boolean;
  surplus: number;
  deficit: number;

  // Partner / dual-income breakdown (only populated when partnerEnabled === true, filing status
  // is married_jointly, and partnerAnnualSalary > 0 or partnerBonusIncome > 0 — i.e., when
  // dual-income is fully active)
  partnerGrossMonthly: number;
  partnerNetMonthly: number;
  partnerRetirement: RetirementBreakdown | null;
  householdGrossMonthly: number;
  householdNetMonthly: number;
  /** True when partner income is active and influencing the household tax/income calculation. */
  isDualIncome: boolean;
}

export type RecommendationSeverity = 'warning' | 'info' | 'success';

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  message: string;
  detail?: string;
}

export type HealthScoreLabel = 'Excellent' | 'Strong' | 'Workable' | 'Tight' | 'Risky';

export interface BudgetHealthScore {
  score: number;
  label: HealthScoreLabel;
  breakdown: {
    housingAffordability: number;
    retirementRate: number;
    emergencyFundContrib: number;
    houseFundContrib: number;
    monthlyBuffer: number;
    debtCarBurden: number;
    petCostBurden: number;
    totalSavingsRate: number;
  };
}

export interface RebalanceChange {
  fieldId: string;
  label: string;
  oldValue: number;
  newValue: number;
  delta: number;
}

export interface RebalanceResult {
  updatedInputs: BudgetInputs;
  changes: RebalanceChange[];
  newBuffer: number;
  success: boolean;
  message: string;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  inputs: Partial<BudgetInputs>;
}

export interface ExpenseCategory {
  id: string;
  label: string;
  category: BudgetCategory;
  fields: Array<{ key: keyof BudgetInputs; label: string }>;
}

export type TrackableCategory =
  | 'dining_out'
  | 'gasoline'
  | 'electricity'
  | 'water'
  | 'online_shopping'
  | 'groceries'
  | 'subscriptions'
  | 'gas_utility'
  | 'internet'
  | 'phone';

export interface SpendingEntry {
  id: string;
  date: string; // ISO date format: YYYY-MM-DD
  category: TrackableCategory;
  amount: number;
  note?: string;
  createdAt: string; // ISO timestamp
}

export interface CategoryMetrics {
  category: TrackableCategory;
  label: string;
  entries: SpendingEntry[];
  totalSpent: number;
  averageMonthly: number;
  currentMonthSpent: number;
  budgetedMonthly: number;
  variance: number; // Actual - Budgeted
  trend: 'up' | 'down' | 'stable'; // Based on monthly trend
  trendPercent: number; // % change from previous month
  forecastNextMonth: number;
}

export interface SpendingHistory {
  entries: SpendingEntry[];
  lastUpdated: string; // ISO timestamp
  version: number;
}

// ─── Named Budget Slots (E2-T3) ───────────────────────────────────────────────

/** A user-saved snapshot of BudgetInputs with a custom name. */
export interface NamedBudget {
  id: string;
  name: string;
  inputs: BudgetInputs;
  createdAt: string; // ISO timestamp
}

// ─── Custom Scenario Presets (E2-T4) ─────────────────────────────────────────

/** A user-created preset that extends the built-in preset list. */
export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  inputs: Partial<BudgetInputs>;
  createdAt: string; // ISO timestamp
}

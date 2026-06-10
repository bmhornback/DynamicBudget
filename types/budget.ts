// Core budget types for MoveMath

export type FilingStatus = 'single' | 'married_jointly' | 'head_of_household';

export type StateOfResidence = 'CA' | 'GA' | 'no_state_tax' | string;

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
  /** Whether contribution maxes out the 401(k) */
  isMaxing401k: boolean;
  /** Monthly employer match */
  monthlyEmployerMatch: number;
  /** Annual employer match */
  annualEmployerMatch: number;
  /** Monthly IRA contribution */
  monthlyIRA: number;
  /** Annual IRA contribution */
  annualIRA: number;
  /** Total monthly retirement savings (employee only) */
  totalMonthlyEmployee: number;
  /** Total annual retirement savings (employee only) */
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
  maxOut401k: boolean;
  employerMatchPercent: number;
  bonusIncome: number;
  otherMonthlyIncome: number;

  // Housing
  rent: number;
  petRent: number;
  rentersInsurance: number;
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
  extraDebtPayoff: number;
  generalCashSavings: number;

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
  rentAsPercentGross: number;
  rentAsPercentTakeHome: number;
  petCostsAsPercentTakeHome: number;
  carCostsAsPercentTakeHome: number;

  // Emergency fund
  essentialExpensesMonthly: number;
  emergencyFundTargetCalculated: number;

  // Status
  isOverBudget: boolean;
  surplus: number;
  deficit: number;
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
    rentAffordability: number;
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

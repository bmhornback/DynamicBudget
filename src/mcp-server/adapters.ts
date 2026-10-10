/**
 * MCP ↔ BudgetInputs adapter for DynamicBudget MCP server.
 *
 * Converts the flat parameter objects supplied by AI tool calls into
 * fully-populated BudgetInputs values that the calculation engine accepts.
 * All MCP params that are not explicitly supplied fall back to sensible
 * defaults (zeroed-out expenses so the caller gets exactly what they ask for,
 * not the app's demo defaults).
 */

import type { BudgetInputs, FilingStatus, HousingMode, IRAType, StateOfResidence } from '../../types/budget';

export const STATE_ENUM = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC',
  'FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT',
  'NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY','no_state_tax',
] as const;

/** Raw expenses block from the MCP schema. */
export interface McpExpenses {
  rent?: number;
  mortgage?: number;
  property_tax?: number;
  home_insurance?: number;
  home_maintenance_reserve?: number;
  electric?: number;
  gas?: number;
  water?: number;
  trash?: number;
  internet?: number;
  phone?: number;
  groceries?: number;
  dining_out?: number;
  fuel?: number;
  car_insurance?: number;
  car_payment?: number;
  car_maintenance?: number;
  health_insurance?: number;
  prescriptions?: number;
  gym_fitness?: number;
  streaming_subscriptions?: number;
  fun_entertainment?: number;
  clothes?: number;
  misc_buffer?: number;
}

/** Raw savings block from the MCP schema. */
export interface McpSavings {
  retirement_contribution_percent?: number;
  max_out_401k?: boolean;
  employer_match_percent?: number;
  ira_contribution?: number;
  ira_type?: string;
  hsa_contribution?: number;
  emergency_fund_months?: number;
  house_down_payment_target?: number;
  monthly_house_fund_contribution?: number;
  monthly_taxable_investments?: number;
}

/** Shared core params that most tools accept. */
export interface McpCoreBudgetParams {
  salary: number;
  state: string;
  filing_status?: string;
  age?: number;
  housing_mode?: string;
  expenses?: McpExpenses;
  savings?: McpSavings;
}

/**
 * Build a clean BudgetInputs from MCP tool parameters.
 *
 * Starts from a zero-expense base so the caller gets exactly what they
 * specify, then layers on their expense/savings overrides.
 */
export function buildBudgetInputs(params: McpCoreBudgetParams): BudgetInputs {
  const e = params.expenses ?? {};
  const s = params.savings ?? {};

  const base: BudgetInputs = {
    // ── Income ─────────────────────────────────────────────────────────────
    annualSalary: params.salary,
    state: params.state as StateOfResidence,
    filingStatus: (params.filing_status ?? 'single') as FilingStatus,
    retirementContributionPercent: s.retirement_contribution_percent ?? 6,
    is401kRoth: false,
    maxOut401k: s.max_out_401k ?? false,
    employerMatchPercent: s.employer_match_percent ?? 3,
    employerMatchCapPercent: 100,
    userAge: params.age ?? 30,
    bonusIncome: 0,
    bonusTaxMode: 'blended_annual',
    esppIncome: 0,
    rsuVestingIncome: 0,
    otherMonthlyIncome: 0,
    incomeVariabilityPercent: 0,

    // ── Partner ─────────────────────────────────────────────────────────────
    partnerEnabled: false,
    partnerAnnualSalary: 0,
    partnerBonusIncome: 0,
    partnerRetirementContributionPercent: 0,
    partnerIs401kRoth: false,
    partnerMaxOut401k: false,
    partnerEmployerMatchPercent: 0,
    partnerEmployerMatchCapPercent: 100,
    partnerAge: 0,

    // ── Housing ─────────────────────────────────────────────────────────────
    housingMode: (params.housing_mode ?? 'renter') as HousingMode,
    rent: e.rent ?? 0,
    petRent: 0,
    rentersInsurance: 0,
    mortgagePayment: e.mortgage ?? 0,
    propertyTax: e.property_tax ?? 0,
    homeInsurance: e.home_insurance ?? 0,
    homeMaintenanceReserve: e.home_maintenance_reserve ?? 0,
    parkingFee: 0,
    hoaFee: 0,

    // ── Utilities ───────────────────────────────────────────────────────────
    electric: e.electric ?? 0,
    gas: e.gas ?? 0,
    water: e.water ?? 0,
    trash: e.trash ?? 0,
    internet: e.internet ?? 0,
    phone: e.phone ?? 0,

    // ── Transportation ──────────────────────────────────────────────────────
    carSituation: e.car_payment ? 'car_loan' : 'owned_outright',
    carPayment: e.car_payment ?? 0,
    fuel: e.fuel ?? 0,
    carInsurance: e.car_insurance ?? 0,
    carMaintenance: e.car_maintenance ?? 0,
    carParking: 0,
    tolls: 0,
    rideShareTransit: 0,

    // ── Pets ────────────────────────────────────────────────────────────────
    petsEnabled: false,
    numberOfPets: 0,
    petFood: 0,
    vetMedications: 0,
    petInsurance: 0,
    groomingSupplies: 0,
    dogDaycare: 0,
    boardingSitter: 0,
    emergencyPetFund: 0,

    // ── Food & household ────────────────────────────────────────────────────
    groceries: e.groceries ?? 0,
    householdBasics: 0,
    diningOut: e.dining_out ?? 0,

    // ── Health ──────────────────────────────────────────────────────────────
    healthInsurance: e.health_insurance ?? 0,
    dentalInsurance: 0,
    visionInsurance: 0,
    lifeInsurance: 0,
    prescriptions: e.prescriptions ?? 0,
    gymFitness: e.gym_fitness ?? 0,
    therapyWellness: 0,

    // ── Savings & investing ─────────────────────────────────────────────────
    emergencyFundContribution: 0,
    emergencyFundTarget: 0,
    houseDownPaymentContribution: s.monthly_house_fund_contribution ?? 0,
    houseDownPaymentTarget: s.house_down_payment_target ?? 0,
    taxableInvestments: s.monthly_taxable_investments ?? 0,
    iraContribution: s.ira_contribution ?? 0,
    iraType: ((s.ira_type ?? 'traditional') as IRAType),
    maxOutIRA: false,
    hsaContribution: s.hsa_contribution ?? 0,
    hsaEligible: (s.hsa_contribution ?? 0) > 0,
    maxOutHSA: false,
    extraDebtPayoff: 0,
    debtPayoffStrategy: 'avalanche',
    debts: [],
    generalCashSavings: 0,
    isSavingsByPercentage: false,
    savingsPercentOfNetIncome: 30,
    annualExpenses: [],
    longTermGoals: [],

    // ── Lifestyle ───────────────────────────────────────────────────────────
    funEntertainment: e.fun_entertainment ?? 0,
    travel: 0,
    clothes: e.clothes ?? 0,
    subscriptions: e.streaming_subscriptions ?? 0,
    personalSpending: 0,
    gifts: 0,
    miscBuffer: e.misc_buffer ?? 0,

    // ── App state ───────────────────────────────────────────────────────────
    lockedFields: {},
    budgetMode: 'manual',
    rebalanceStrategy: 'reduce_lifestyle_first',
    surplusAllocation: 'house_fund',
    payFrequency: 'semimonthly',
    spendingHistory: { entries: [], lastUpdated: '', version: 1 },
  };

  return base;
}

/** Validate that a state string is a recognised US state code. */
export function isValidState(value: string): value is StateOfResidence {
  return (STATE_ENUM as readonly string[]).includes(value);
}

/** Round to two decimal places (safe for currency display). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

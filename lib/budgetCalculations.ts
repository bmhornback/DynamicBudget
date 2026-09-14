/**
 * Core budget calculation utilities for DynamicBudget.
 * All logic is pure/deterministic — no React, no side effects.
 */

import type { BudgetInputs, BudgetBreakdown, TaxBreakdown, RetirementBreakdown } from '@/types/budget';
import { DEFAULT_INPUTS } from './defaultScenarios';
import { clamp } from './formatters';
import {
  calculateRetirementContribution,
  calculateNetMonthlyIncome,
  calculateCombinedNetMonthlyIncome,
  ANNUAL_401K_LIMIT,
  ANNUAL_IRA_LIMIT,
  ANNUAL_IRA_CATCHUP_LIMIT,
  ANNUAL_HSA_LIMIT_SELF,
  ANNUAL_HSA_LIMIT_FAMILY,
  getIRALimit,
} from './taxCalculations';

/**
 * Calculate the complete budget breakdown from user inputs.
 */
export function calculateBudgetBreakdown(inputs: BudgetInputs): BudgetBreakdown {
  const {
    annualSalary,
    filingStatus,
    state,
    retirementContributionPercent,
    is401kRoth,
    maxOut401k,
    employerMatchPercent,
    employerMatchCapPercent,
    userAge,
    bonusIncome,
    otherMonthlyIncome,
    iraContribution,
    iraType,
    maxOutIRA,
    hsaContribution,
    hsaEligible,
    maxOutHSA,
    isSavingsByPercentage,
    savingsPercentOfNetIncome,
    partnerEnabled,
    partnerAnnualSalary,
    partnerBonusIncome,
    partnerRetirementContributionPercent,
    partnerIs401kRoth,
    partnerMaxOut401k,
    partnerEmployerMatchPercent,
    partnerEmployerMatchCapPercent,
    partnerAge,
  } = inputs;

  // ── Retirement ────────────────────────────────────────────────────────────
  const retCalc = calculateRetirementContribution(
    annualSalary,
    retirementContributionPercent,
    maxOut401k,
    employerMatchPercent,
    employerMatchCapPercent,
    userAge
  );

  // Calculate IRA contribution with max-out logic (age-adjusted limit)
  const iraLimit = getIRALimit(userAge);
  let annualIRA: number;
  if (maxOutIRA) {
    annualIRA = iraLimit;
  } else {
    annualIRA = Math.min((iraContribution || 0) * 12, iraLimit);
  }
  const monthlyIRA = annualIRA / 12;
  const isMaxingIRA = annualIRA >= iraLimit;

  // Calculate IRA catch-up (age 50+)
  const eligibleIRACatchUp = userAge >= 50 ? ANNUAL_IRA_CATCHUP_LIMIT : 0;
  const annualIRACatchUp = maxOutIRA && eligibleIRACatchUp > 0 ? eligibleIRACatchUp : 0;
  const monthlyIRACatchUp = annualIRACatchUp / 12;

  // Calculate HSA contribution with max-out logic
  let annualHSA: number = 0;
  let monthlyHSA: number = 0;
  let isMaxingHSA: boolean = false;

  if (hsaEligible) {
    // Determine HSA limit based on filing status (simplified: treat married_jointly as family, others as self)
    const hsaLimit = filingStatus === 'married_jointly' ? ANNUAL_HSA_LIMIT_FAMILY : ANNUAL_HSA_LIMIT_SELF;

    if (maxOutHSA) {
      annualHSA = hsaLimit;
    } else {
      annualHSA = Math.min((hsaContribution || 0) * 12, hsaLimit);
    }
    monthlyHSA = annualHSA / 12;
    isMaxingHSA = annualHSA >= hsaLimit;
  }

  // For retirement savings rate calculation:
  // Include 401(k) + catch-up, IRA + catch-up (both types), and HSA
  const totalEmployeeRetirementAnnual = retCalc.annual401k + retCalc.annual401kCatchUp + annualIRA + annualIRACatchUp + annualHSA;
  const totalEmployeeRetirementMonthly = retCalc.monthly401k + retCalc.monthly401kCatchUp + monthlyIRA + monthlyIRACatchUp + monthlyHSA;

  const retirementBreakdown: RetirementBreakdown = {
    monthly401k: retCalc.monthly401k,
    annual401k: retCalc.annual401k,
    is401kRoth,
    isMaxing401k: retCalc.isMaxing401k,
    monthly401kCatchUp: retCalc.monthly401kCatchUp,
    annual401kCatchUp: retCalc.annual401kCatchUp,
    monthlyEmployerMatch: retCalc.monthlyEmployerMatch,
    annualEmployerMatch: retCalc.annualEmployerMatch,
    monthlyEmployerMatchCapped: retCalc.monthlyEmployerMatchCapped,
    annualEmployerMatchCapped: retCalc.annualEmployerMatchCapped,
    monthlyIRA,
    annualIRA,
    iraType,
    isMaxingIRA,
    monthlyIRACatchUp,
    annualIRACatchUp,
    monthlyHSA,
    annualHSA,
    isMaxingHSA,
    totalMonthlyEmployee: totalEmployeeRetirementMonthly,
    totalAnnualEmployee: totalEmployeeRetirementAnnual,
    retirementSavingsRate: annualSalary > 0 ? totalEmployeeRetirementAnnual / annualSalary : 0,
    isSaving15Percent: annualSalary > 0 ? totalEmployeeRetirementAnnual / annualSalary >= 0.15 : false,
  };

  // ── Partner Income (E5-T7) ────────────────────────────────────────────────
  const isDualIncome = partnerEnabled && filingStatus === 'married_jointly' &&
    (partnerAnnualSalary > 0 || partnerBonusIncome > 0);

  // Calculate partner's retirement contributions when dual-income is active
  const partnerRetCalc = isDualIncome
    ? calculateRetirementContribution(
        partnerAnnualSalary,
        partnerRetirementContributionPercent,
        partnerMaxOut401k,
        partnerEmployerMatchPercent,
        partnerEmployerMatchCapPercent,
        partnerAge
      )
    : null;

  // Partner 401k pre-tax vs Roth
  const partnerAnnual401kPreTax = isDualIncome && partnerRetCalc && !partnerIs401kRoth
    ? partnerRetCalc.annual401k
    : 0;
  const partnerAnnualRoth401k = isDualIncome && partnerRetCalc && partnerIs401kRoth
    ? partnerRetCalc.annual401k
    : 0;

  const partnerRetirementBreakdown: RetirementBreakdown | null = isDualIncome && partnerRetCalc
    ? {
        monthly401k: partnerRetCalc.monthly401k,
        annual401k: partnerRetCalc.annual401k,
        is401kRoth: partnerIs401kRoth,
        isMaxing401k: partnerRetCalc.isMaxing401k,
        monthly401kCatchUp: partnerRetCalc.monthly401kCatchUp,
        annual401kCatchUp: partnerRetCalc.annual401kCatchUp,
        monthlyEmployerMatch: partnerRetCalc.monthlyEmployerMatch,
        annualEmployerMatch: partnerRetCalc.annualEmployerMatch,
        monthlyEmployerMatchCapped: partnerRetCalc.monthlyEmployerMatchCapped,
        annualEmployerMatchCapped: partnerRetCalc.annualEmployerMatchCapped,
        monthlyIRA: 0,
        annualIRA: 0,
        iraType: 'traditional',
        isMaxingIRA: false,
        monthlyIRACatchUp: 0,
        annualIRACatchUp: 0,
        monthlyHSA: 0,
        annualHSA: 0,
        isMaxingHSA: false,
        totalMonthlyEmployee: partnerRetCalc.monthly401k + partnerRetCalc.monthly401kCatchUp,
        totalAnnualEmployee: partnerRetCalc.annual401k + partnerRetCalc.annual401kCatchUp,
        retirementSavingsRate: partnerAnnualSalary > 0
          ? (partnerRetCalc.annual401k + partnerRetCalc.annual401kCatchUp) / partnerAnnualSalary
          : 0,
        isSaving15Percent: partnerAnnualSalary > 0
          ? (partnerRetCalc.annual401k + partnerRetCalc.annual401kCatchUp) / partnerAnnualSalary >= 0.15
          : false,
      }
    : null;

  // ── Net Monthly Income ────────────────────────────────────────────────────
  // Primary person pre-tax 401k (Traditional only)
  const primaryAnnual401kPreTax = is401kRoth ? 0 : retCalc.annual401k;
  const primaryAnnualRoth401k = is401kRoth ? retCalc.annual401k : 0;
  const annualTraditionalIRA = iraType === 'traditional' ? annualIRA : 0;
  const annualRothIRA = iraType === 'roth' ? annualIRA : 0;

  let netCalc: ReturnType<typeof calculateNetMonthlyIncome> | null = null;
  let combinedCalc: ReturnType<typeof calculateCombinedNetMonthlyIncome> | null = null;

  if (isDualIncome) {
    combinedCalc = calculateCombinedNetMonthlyIncome(
      annualSalary,
      bonusIncome,
      primaryAnnual401kPreTax,
      annualTraditionalIRA,
      annualHSA,
      annualRothIRA,
      primaryAnnualRoth401k,
      partnerAnnualSalary,
      partnerBonusIncome,
      partnerAnnual401kPreTax,
      partnerAnnualRoth401k,
      state,
      otherMonthlyIncome
    );
    // In dual-income mode, combinedCalc provides all tax/income figures.
    // netCalc is only populated in the solo path (below).
  } else {
    netCalc = calculateNetMonthlyIncome(
      annualSalary,
      filingStatus,
      state,
      retCalc.annual401k,
      annualIRA,
      bonusIncome,
      otherMonthlyIncome,
      iraType,
      annualHSA,
      is401kRoth
    );
  }

  const taxBreakdown: TaxBreakdown = isDualIncome && combinedCalc
    ? {
        grossAnnual: annualSalary + bonusIncome + partnerAnnualSalary + partnerBonusIncome,
        grossMonthly: combinedCalc.combinedGrossMonthly,
        federalAnnual: combinedCalc.federalTaxAnnual,
        federalMonthly: combinedCalc.federalTaxAnnual / 12,
        stateAnnual: combinedCalc.stateTaxAnnual,
        stateMonthly: combinedCalc.stateTaxAnnual / 12,
        payrollAnnual: combinedCalc.payrollTaxAnnual,
        payrollMonthly: combinedCalc.payrollTaxAnnual / 12,
        totalTaxAnnual: combinedCalc.totalTaxAnnual,
        totalTaxMonthly: combinedCalc.totalTaxAnnual / 12,
        effectiveTaxRate: combinedCalc.effectiveTaxRate,
      }
    : {
        grossAnnual: annualSalary + bonusIncome,
        grossMonthly: netCalc!.grossMonthly,
        federalAnnual: netCalc!.federalTaxAnnual,
        federalMonthly: netCalc!.federalTaxMonthly,
        stateAnnual: netCalc!.stateTaxAnnual,
        stateMonthly: netCalc!.stateTaxMonthly,
        payrollAnnual: netCalc!.payrollTaxAnnual,
        payrollMonthly: netCalc!.payrollTaxMonthly,
        totalTaxAnnual: netCalc!.totalTaxAnnual,
        totalTaxMonthly: netCalc!.totalTaxAnnual / 12,
        effectiveTaxRate: netCalc!.effectiveTaxRate,
      };

  // ── Expense Totals ────────────────────────────────────────────────────────
  const isHomeowner = inputs.housingMode === 'homeowner';
  const primaryHousingPayment = isHomeowner ? inputs.mortgagePayment : inputs.rent;
  const totalHousing = isHomeowner
    ? inputs.mortgagePayment +
      inputs.propertyTax +
      inputs.homeInsurance +
      inputs.homeMaintenanceReserve +
      inputs.parkingFee +
      inputs.hoaFee
    : inputs.rent +
      inputs.petRent +
      inputs.rentersInsurance +
      inputs.parkingFee +
      inputs.hoaFee;

  const totalUtilities =
    inputs.electric +
    inputs.gas +
    inputs.water +
    inputs.trash +
    inputs.internet +
    inputs.phone;

  const totalTransportation =
    inputs.carPayment +
    inputs.fuel +
    inputs.carInsurance +
    inputs.carMaintenance +
    inputs.carParking +
    inputs.tolls +
    inputs.rideShareTransit;

  const totalPets = inputs.petsEnabled
    ? inputs.petFood +
      inputs.vetMedications +
      inputs.petInsurance +
      inputs.groomingSupplies +
      inputs.dogDaycare +
      inputs.boardingSitter +
      inputs.emergencyPetFund
    : 0;

  const totalGroceriesFood = inputs.groceries + inputs.householdBasics + inputs.diningOut;

  const totalHealth =
    inputs.healthInsurance +
    inputs.prescriptions +
    inputs.gymFitness +
    inputs.therapyWellness;

  const totalLifestyle =
    inputs.funEntertainment +
    inputs.travel +
    inputs.clothes +
    inputs.subscriptions +
    inputs.personalSpending +
    inputs.gifts +
    inputs.miscBuffer;

  // ── Savings & Investing ───────────────────────────────────────────────────
  // If percentage-based savings is enabled, calculate based on net income
  // Otherwise, use fixed dollar amounts from inputs
  // When dual-income is active, net monthly reflects the combined household take-home.
  const netMonthly = isDualIncome && combinedCalc
    ? combinedCalc.combinedNetMonthly
    : netCalc!.netMonthly;
  const savingsPercentage = isSavingsByPercentage
    ? clamp(
        Number.isFinite(savingsPercentOfNetIncome)
          ? savingsPercentOfNetIncome
          : DEFAULT_INPUTS.savingsPercentOfNetIncome,
        0,
        50
      )
    : 0;
  const calculatedSavingsFromPercentage = isSavingsByPercentage
    ? netMonthly * (savingsPercentage / 100)
    : 0;

  const totalSavings = isSavingsByPercentage
    ? calculatedSavingsFromPercentage
    : inputs.emergencyFundContribution +
      inputs.houseDownPaymentContribution +
      inputs.generalCashSavings;

  const totalInvestments = isSavingsByPercentage ? 0 : inputs.taxableInvestments;
  const debtMinimumPayments = isSavingsByPercentage
    ? 0
    : (inputs.debts ?? []).reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0);
  const totalDebtPayoff = isSavingsByPercentage ? 0 : debtMinimumPayments + inputs.extraDebtPayoff;

  // ── Aggregates ────────────────────────────────────────────────────────────
  // Fixed = housing + utilities + transportation + health + groceries (baseline)
  const totalFixedExpenses =
    totalHousing + totalUtilities + totalTransportation + totalHealth;

  const totalVariableExpenses = totalGroceriesFood + totalLifestyle + totalPets;

  const totalAllocated =
    totalHousing +
    totalUtilities +
    totalTransportation +
    totalPets +
    totalGroceriesFood +
    totalHealth +
    totalLifestyle +
    totalSavings +
    totalInvestments +
    totalDebtPayoff;

  const remainingMonthlyBuffer = netMonthly - totalAllocated;

  // ── Essential Expenses (for emergency fund target) ───────────────────────
  // Essential = housing + utilities + transportation + groceries + health
  const essentialExpensesMonthly =
    totalHousing +
    totalUtilities +
    totalTransportation +
    inputs.groceries +
    inputs.householdBasics +
    totalHealth +
    (inputs.petsEnabled ? inputs.petFood + inputs.vetMedications : 0);

  const emergencyFundTargetCalculated = essentialExpensesMonthly * 6;

  // ── Annual Projections ────────────────────────────────────────────────────
  const annualHouseFund = inputs.houseDownPaymentContribution * 12;
  const annualTaxableInvestments = inputs.taxableInvestments * 12;
  
  // Calculate Roth IRA contribution (for tracking in breakdown)
  const monthlyRothIRA = iraType === 'roth' ? monthlyIRA : 0;
  
  const totalAnnualSavingsIncludingRetirement =
    (totalSavings + totalInvestments) * 12 +
    retCalc.annual401k + retCalc.annual401kCatchUp + annualIRA + annualHSA +
    (isDualIncome && partnerRetCalc ? partnerRetCalc.annual401k + partnerRetCalc.annual401kCatchUp : 0);

  // ── Rates ─────────────────────────────────────────────────────────────────
  const grossMonthly = isDualIncome && combinedCalc
    ? combinedCalc.combinedGrossMonthly
    : netCalc!.grossMonthly;

  const savingsRateGross =
    grossMonthly > 0
      ? ((totalSavings + totalInvestments + retCalc.monthly401k + monthlyIRA + monthlyHSA) / grossMonthly)
      : 0;

  const savingsRateNet =
    netMonthly > 0
      ? ((totalSavings + totalInvestments) / netMonthly)
      : 0;

  const primaryHousingPaymentAsPercentGross = grossMonthly > 0 ? primaryHousingPayment / grossMonthly : 0;
  const primaryHousingPaymentAsPercentTakeHome = netMonthly > 0 ? primaryHousingPayment / netMonthly : 0;
  const petCostsAsPercentTakeHome = netMonthly > 0 ? totalPets / netMonthly : 0;
  const carCostsAsPercentTakeHome = netMonthly > 0 ? totalTransportation / netMonthly : 0;

  const isOverBudget = remainingMonthlyBuffer < 0;
  const surplus = isOverBudget ? 0 : remainingMonthlyBuffer;
  const deficit = isOverBudget ? Math.abs(remainingMonthlyBuffer) : 0;

  return {
    grossMonthly,
    netMonthlyIncome: netMonthly,
    taxes: taxBreakdown,
    retirement: retirementBreakdown,
    totalHousing,
    totalUtilities,
    totalTransportation,
    totalPets,
    totalGroceriesFood,
    totalHealth,
    totalLifestyle,
    totalSavings,
    totalInvestments,
    totalDebtPayoff,
    calculatedSavingsFromPercentage,
    effectiveEmergencyFundContribution: isSavingsByPercentage ? calculatedSavingsFromPercentage : inputs.emergencyFundContribution,
    effectiveHouseDownPaymentContribution: isSavingsByPercentage ? 0 : inputs.houseDownPaymentContribution,
    monthlyRothIRA,
    monthlyHSA,
    totalFixedExpenses,
    totalVariableExpenses,
    totalAllocated,
    remainingMonthlyBuffer,
    annualHouseFund,
    annualTaxableInvestments,
    totalAnnualSavingsIncludingRetirement,
    savingsRateGross,
    savingsRateNet,
    primaryHousingPaymentAsPercentGross,
    primaryHousingPaymentAsPercentTakeHome,
    petCostsAsPercentTakeHome,
    carCostsAsPercentTakeHome,
    essentialExpensesMonthly,
    emergencyFundTargetCalculated,
    isOverBudget,
    surplus,
    deficit,
    // Partner / dual-income fields
    partnerGrossMonthly: isDualIncome && combinedCalc ? combinedCalc.partnerGrossMonthly : 0,
    // partnerNetMonthly uses a proportional approximation: each earner's share of the combined
    // tax bill is weighted by their gross income share. This is for display-only attribution
    // and is not expected to sum precisely to combinedNetMonthly (which uses the exact combined
    // net formula). Use householdNetMonthly for the authoritative combined take-home figure.
    partnerNetMonthly: isDualIncome && combinedCalc && combinedCalc.combinedGrossMonthly > 0
      ? Math.max(
          0,
          combinedCalc.partnerGrossMonthly -
            (combinedCalc.totalTaxAnnual / 12) *
              (combinedCalc.partnerGrossMonthly / combinedCalc.combinedGrossMonthly) -
            (partnerRetCalc ? (partnerAnnual401kPreTax + partnerAnnualRoth401k) / 12 : 0)
        )
      : 0,
    partnerRetirement: partnerRetirementBreakdown,
    householdGrossMonthly: isDualIncome && combinedCalc ? combinedCalc.combinedGrossMonthly : grossMonthly,
    householdNetMonthly: isDualIncome && combinedCalc ? combinedCalc.combinedNetMonthly : netMonthly,
    isDualIncome,
  };
}

/** Maximum recommended values for common budget items */
export const BUDGET_THRESHOLDS = {
  rentPercentGross: 0.30,
  rentPercentTakeHome: 0.40,
  petPercentTakeHome: 0.15,
  carPercentTakeHome: 0.15,
  minMonthlyBuffer: 250,
  minRetirementRate: 0.15,
  maxLifestylePercentTakeHome: 0.30,
} as const;

export { ANNUAL_401K_LIMIT, ANNUAL_IRA_LIMIT };

/**
 * Core budget calculation utilities for MoveMath.
 * All logic is pure/deterministic — no React, no side effects.
 */

import type { BudgetInputs, BudgetBreakdown, TaxBreakdown, RetirementBreakdown } from '@/types/budget';
import { DEFAULT_INPUTS } from './defaultScenarios';
import { clamp } from './formatters';
import {
  calculateRetirementContribution,
  calculateNetMonthlyIncome,
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

  // ── Net Monthly Income ────────────────────────────────────────────────────
  const netCalc = calculateNetMonthlyIncome(
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

  const taxBreakdown: TaxBreakdown = {
    grossAnnual: annualSalary + bonusIncome,
    grossMonthly: netCalc.grossMonthly,
    federalAnnual: netCalc.federalTaxAnnual,
    federalMonthly: netCalc.federalTaxMonthly,
    stateAnnual: netCalc.stateTaxAnnual,
    stateMonthly: netCalc.stateTaxMonthly,
    payrollAnnual: netCalc.payrollTaxAnnual,
    payrollMonthly: netCalc.payrollTaxMonthly,
    totalTaxAnnual: netCalc.totalTaxAnnual,
    totalTaxMonthly: netCalc.totalTaxAnnual / 12,
    effectiveTaxRate: netCalc.effectiveTaxRate,
  };

  // ── Expense Totals ────────────────────────────────────────────────────────
  const totalHousing =
    inputs.rent +
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
  const netMonthly = netCalc.netMonthly;
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

  const totalInvestments = isSavingsByPercentage ? 0 : inputs.taxableInvestments + inputs.extraDebtPayoff;

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
    totalInvestments;

  const remainingMonthlyBuffer = netCalc.netMonthly - totalAllocated;

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
    (totalSavings + totalInvestments) * 12 + retCalc.annual401k + annualIRA + annualHSA;

  // ── Rates ─────────────────────────────────────────────────────────────────
  const grossMonthly = netCalc.grossMonthly;

  const savingsRateGross =
    grossMonthly > 0
      ? ((totalSavings + totalInvestments + retCalc.monthly401k + monthlyIRA + monthlyHSA) / grossMonthly)
      : 0;

  const savingsRateNet =
    netMonthly > 0
      ? ((totalSavings + totalInvestments) / netMonthly)
      : 0;

  const rentAsPercentGross = grossMonthly > 0 ? inputs.rent / grossMonthly : 0;
  const rentAsPercentTakeHome = netMonthly > 0 ? inputs.rent / netMonthly : 0;
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
    rentAsPercentGross,
    rentAsPercentTakeHome,
    petCostsAsPercentTakeHome,
    carCostsAsPercentTakeHome,
    essentialExpensesMonthly,
    emergencyFundTargetCalculated,
    isOverBudget,
    surplus,
    deficit,
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

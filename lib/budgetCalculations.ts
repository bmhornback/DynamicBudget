/**
 * Core budget calculation utilities for MoveMath.
 * All logic is pure/deterministic — no React, no side effects.
 */

import type { BudgetInputs, BudgetBreakdown, TaxBreakdown, RetirementBreakdown } from '@/types/budget';
import {
  calculateRetirementContribution,
  calculateNetMonthlyIncome,
  ANNUAL_401K_LIMIT,
  ANNUAL_IRA_LIMIT,
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
    maxOut401k,
    employerMatchPercent,
    bonusIncome,
    otherMonthlyIncome,
    iraContribution,
  } = inputs;

  // ── Retirement ────────────────────────────────────────────────────────────
  const retCalc = calculateRetirementContribution(
    annualSalary,
    retirementContributionPercent,
    maxOut401k,
    employerMatchPercent
  );

  // Cap IRA at annual limit
  const annualIRA = Math.min((iraContribution || 0) * 12, ANNUAL_IRA_LIMIT);
  const monthlyIRA = annualIRA / 12;

  const retirementBreakdown: RetirementBreakdown = {
    monthly401k: retCalc.monthly401k,
    annual401k: retCalc.annual401k,
    isMaxing401k: retCalc.isMaxing401k,
    monthlyEmployerMatch: retCalc.monthlyEmployerMatch,
    annualEmployerMatch: retCalc.annualEmployerMatch,
    monthlyIRA,
    annualIRA,
    totalMonthlyEmployee: retCalc.monthly401k + monthlyIRA,
    totalAnnualEmployee: retCalc.annual401k + annualIRA,
    retirementSavingsRate:
      annualSalary > 0 ? (retCalc.annual401k + annualIRA) / annualSalary : 0,
    isSaving15Percent:
      annualSalary > 0 ? (retCalc.annual401k + annualIRA) / annualSalary >= 0.15 : false,
  };

  // ── Net Monthly Income ────────────────────────────────────────────────────
  const netCalc = calculateNetMonthlyIncome(
    annualSalary,
    filingStatus,
    state,
    retCalc.annual401k,
    annualIRA,
    bonusIncome,
    otherMonthlyIncome
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
  const totalSavings =
    inputs.emergencyFundContribution +
    inputs.houseDownPaymentContribution +
    inputs.generalCashSavings;

  const totalInvestments = inputs.taxableInvestments + inputs.extraDebtPayoff;

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
  const totalAnnualSavingsIncludingRetirement =
    (totalSavings + totalInvestments) * 12 + retCalc.annual401k + annualIRA;

  // ── Rates ─────────────────────────────────────────────────────────────────
  const grossMonthly = netCalc.grossMonthly;
  const netMonthly = netCalc.netMonthly;

  const savingsRateGross =
    grossMonthly > 0
      ? ((totalSavings + totalInvestments + retCalc.monthly401k + monthlyIRA) / grossMonthly)
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

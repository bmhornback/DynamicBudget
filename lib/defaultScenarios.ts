/**
 * Default budget scenarios / presets for MoveMath.
 */

import type { BudgetInputs, ScenarioPreset } from '@/types/budget';

export const DEFAULT_INPUTS: BudgetInputs = {
  // Income
  annualSalary: 190000,
  state: 'CA',
  filingStatus: 'single',
  retirementContributionPercent: 15,
  maxOut401k: false,
  employerMatchPercent: 3,
  bonusIncome: 0,
  otherMonthlyIncome: 0,

  // Housing
  rent: 3000,
  petRent: 75,
  rentersInsurance: 20,
  parkingFee: 100,
  hoaFee: 0,

  // Utilities
  electric: 80,
  gas: 30,
  water: 40,
  trash: 20,
  internet: 80,
  phone: 90,

  // Transportation (owns car outright)
  carSituation: 'owned_outright',
  carPayment: 0,
  fuel: 180,
  carInsurance: 160,
  carMaintenance: 100,
  carParking: 0,
  tolls: 20,
  rideShareTransit: 30,

  // Pets
  petsEnabled: true,
  numberOfPets: 1,
  petFood: 120,
  vetMedications: 80,
  petInsurance: 60,
  groomingSupplies: 50,
  dogDaycare: 400,
  boardingSitter: 100,
  emergencyPetFund: 50,

  // Food & household
  groceries: 600,
  householdBasics: 150,
  diningOut: 300,

  // Health
  healthInsurance: 150,
  prescriptions: 30,
  gymFitness: 50,
  therapyWellness: 0,

  // Savings & investing
  emergencyFundContribution: 500,
  emergencyFundTarget: 0,
  houseDownPaymentContribution: 1700,
  houseDownPaymentTarget: 200000,
  taxableInvestments: 500,
  iraContribution: 0,
  extraDebtPayoff: 0,
  generalCashSavings: 0,

  // Lifestyle
  funEntertainment: 300,
  travel: 200,
  clothes: 100,
  subscriptions: 50,
  personalSpending: 300,
  gifts: 50,
  miscBuffer: 100,

  // App state
  lockedFields: {},
  budgetMode: 'manual',
  rebalanceStrategy: 'reduce_lifestyle_first',
  surplusAllocation: 'house_fund',
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'san_diego_baseline',
    name: 'San Diego Baseline',
    description: 'High-cost city living with pet, owned car, and solid savings.',
    inputs: {
      annualSalary: 190000,
      state: 'CA',
      filingStatus: 'single',
      retirementContributionPercent: 15,
      maxOut401k: false,
      rent: 3000,
      petsEnabled: true,
      dogDaycare: 400,
      carSituation: 'owned_outright',
      carPayment: 0,
      houseDownPaymentContribution: 1700,
      taxableInvestments: 500,
    },
  },
  {
    id: 'aggressive_saver',
    name: 'Aggressive Saver',
    description: 'Max 401(k), large house fund, and high investment contributions.',
    inputs: {
      annualSalary: 210000,
      state: 'CA',
      filingStatus: 'single',
      retirementContributionPercent: 15,
      maxOut401k: true,
      rent: 3000,
      petsEnabled: true,
      dogDaycare: 400,
      carSituation: 'owned_outright',
      carPayment: 0,
      houseDownPaymentContribution: 2400,
      taxableInvestments: 800,
    },
  },
  {
    id: 'tight_move',
    name: 'Tight Move',
    description: 'Lower salary with same San Diego rent — tight budget.',
    inputs: {
      annualSalary: 150000,
      state: 'CA',
      filingStatus: 'single',
      retirementContributionPercent: 15,
      maxOut401k: false,
      rent: 3000,
      petsEnabled: true,
      dogDaycare: 400,
      carSituation: 'owned_outright',
      carPayment: 0,
      houseDownPaymentContribution: 500,
      taxableInvestments: 200,
    },
  },
  {
    id: 'atlanta_baseline',
    name: 'Atlanta / Georgia Baseline',
    description: 'Lower cost of living, lower rent, Georgia state taxes.',
    inputs: {
      annualSalary: 150000,
      state: 'GA',
      filingStatus: 'single',
      retirementContributionPercent: 15,
      maxOut401k: false,
      rent: 2200,
      petsEnabled: true,
      dogDaycare: 300,
      carSituation: 'owned_outright',
      carPayment: 0,
      houseDownPaymentContribution: 1500,
      taxableInvestments: 400,
    },
  },
  {
    id: 'living_with_parents',
    name: 'Living with Parents / Prep Mode',
    description: 'Minimal rent, aggressively saving for a future move.',
    inputs: {
      annualSalary: 120000,
      state: 'GA',
      filingStatus: 'single',
      retirementContributionPercent: 15,
      maxOut401k: false,
      rent: 0,
      petsEnabled: true,
      dogDaycare: 200,
      carSituation: 'owned_outright',
      carPayment: 0,
      houseDownPaymentContribution: 3000,
      taxableInvestments: 500,
      generalCashSavings: 1000,
    },
  },
];

/**
 * Merge a partial scenario preset into the default inputs.
 */
export function applyScenarioPreset(
  preset: Partial<BudgetInputs>
): BudgetInputs {
  return {
    ...DEFAULT_INPUTS,
    ...preset,
    lockedFields: {},
  };
}

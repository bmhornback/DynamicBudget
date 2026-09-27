#!/usr/bin/env node
"use strict";
/**
 * DynamicBudget MCP Server — E10-T3
 *
 * Exposes five budget calculation tools to AI assistants (Claude, ChatGPT, etc.)
 * over the Model Context Protocol using stdio transport.
 *
 * Tools:
 *   1. calculate_monthly_budget      — full budget breakdown for a salary/state
 *   2. analyze_state_move            — financial impact of relocating states
 *   3. calculate_retirement_savings  — 401(k)/IRA projections and catch-up info
 *   4. get_recommendations           — prioritized personal-finance recommendations
 *   5. compare_scenarios             — side-by-side comparison of 2–4 scenarios
 *
 * Usage (Claude Desktop claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "dynamicbudget": {
 *         "command": "node",
 *         "args": ["/path/to/DynamicBudget/dist/mcp-server/src/mcp-server/index.js"]
 *       }
 *     }
 *   }
 *
 * Build: npm run build:mcp
 * Run directly: node dist/mcp-server/src/mcp-server/index.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const calculate_monthly_budget_1 = require("./tools/calculate_monthly_budget");
const analyze_state_move_1 = require("./tools/analyze_state_move");
const calculate_retirement_savings_1 = require("./tools/calculate_retirement_savings");
const get_recommendations_1 = require("./tools/get_recommendations");
const compare_scenarios_1 = require("./tools/compare_scenarios");
const adapters_1 = require("./adapters");
// ─── Shared sub-schemas ────────────────────────────────────────────────────
const stateEnum = zod_1.z.enum(adapters_1.STATE_ENUM);
const filingStatusEnum = zod_1.z.enum(['single', 'married_jointly', 'head_of_household']).optional();
const housingModeEnum = zod_1.z.enum(['renter', 'homeowner']).optional();
const iraTypeEnum = zod_1.z.enum(['traditional', 'roth']).optional();
const expensesSchema = zod_1.z.object({
    rent: zod_1.z.number().min(0).optional(),
    mortgage: zod_1.z.number().min(0).optional(),
    property_tax: zod_1.z.number().min(0).optional(),
    home_insurance: zod_1.z.number().min(0).optional(),
    home_maintenance_reserve: zod_1.z.number().min(0).optional(),
    electric: zod_1.z.number().min(0).optional(),
    gas: zod_1.z.number().min(0).optional(),
    water: zod_1.z.number().min(0).optional(),
    trash: zod_1.z.number().min(0).optional(),
    internet: zod_1.z.number().min(0).optional(),
    phone: zod_1.z.number().min(0).optional(),
    groceries: zod_1.z.number().min(0).optional(),
    dining_out: zod_1.z.number().min(0).optional(),
    fuel: zod_1.z.number().min(0).optional(),
    car_insurance: zod_1.z.number().min(0).optional(),
    car_payment: zod_1.z.number().min(0).optional(),
    car_maintenance: zod_1.z.number().min(0).optional(),
    health_insurance: zod_1.z.number().min(0).optional(),
    prescriptions: zod_1.z.number().min(0).optional(),
    gym_fitness: zod_1.z.number().min(0).optional(),
    streaming_subscriptions: zod_1.z.number().min(0).optional(),
    fun_entertainment: zod_1.z.number().min(0).optional(),
    clothes: zod_1.z.number().min(0).optional(),
    misc_buffer: zod_1.z.number().min(0).optional(),
}).optional();
const savingsSchema = zod_1.z.object({
    retirement_contribution_percent: zod_1.z.number().min(0).max(100).optional(),
    max_out_401k: zod_1.z.boolean().optional(),
    employer_match_percent: zod_1.z.number().min(0).max(100).optional(),
    ira_contribution: zod_1.z.number().min(0).optional(),
    ira_type: iraTypeEnum,
    hsa_contribution: zod_1.z.number().min(0).optional(),
    emergency_fund_months: zod_1.z.number().min(0).max(24).optional(),
    house_down_payment_target: zod_1.z.number().min(0).optional(),
    monthly_house_fund_contribution: zod_1.z.number().min(0).optional(),
    monthly_taxable_investments: zod_1.z.number().min(0).optional(),
}).optional();
// ─── Helper ────────────────────────────────────────────────────────────────
function jsonText(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function errorText(message) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }] };
}
// ─── Server setup ──────────────────────────────────────────────────────────
const server = new mcp_js_1.McpServer({
    name: 'dynamicbudget',
    version: '1.0.0',
});
// ── Tool 1: calculate_monthly_budget ───────────────────────────────────────
server.tool('calculate_monthly_budget', 'Calculates a complete monthly budget breakdown for a given salary, state, expenses, and savings configuration. Returns net income, taxes, expense totals, savings rates, and surplus/deficit.', {
    salary: zod_1.z.number().min(1).max(10_000_000).describe('Annual gross salary in USD.'),
    state: stateEnum.describe("Two-letter US state abbreviation or 'no_state_tax'."),
    filing_status: filingStatusEnum,
    age: zod_1.z.number().int().min(18).max(99).optional().describe('User age. Used for catch-up eligibility.'),
    housing_mode: housingModeEnum,
    expenses: expensesSchema,
    savings: savingsSchema,
}, async (args) => {
    try {
        const result = (0, calculate_monthly_budget_1.calculateMonthlyBudget)(args);
        return jsonText(result);
    }
    catch (err) {
        return errorText(`calculate_monthly_budget failed: ${String(err)}`);
    }
});
// ── Tool 2: analyze_state_move ─────────────────────────────────────────────
server.tool('analyze_state_move', 'Analyzes the financial impact of relocating from one US state to another. Returns state income tax differences, cost-of-living index comparison, purchasing power equivalence, and recommendations.', {
    current_state: stateEnum.describe('Two-letter abbreviation of the current state of residence.'),
    target_state: stateEnum.describe('Two-letter abbreviation of the prospective new state.'),
    salary: zod_1.z.number().min(1).max(10_000_000).describe('Annual gross salary in USD.'),
    filing_status: filingStatusEnum,
    age: zod_1.z.number().int().min(18).max(99).optional(),
    retirement_contribution_percent: zod_1.z.number().min(0).max(100).optional()
        .describe('401(k) contribution percentage used for pre-tax deduction in tax calculations.'),
}, async (args) => {
    try {
        const result = (0, analyze_state_move_1.analyzeStateMove)(args);
        return jsonText(result);
    }
    catch (err) {
        return errorText(`analyze_state_move failed: ${String(err)}`);
    }
});
// ── Tool 3: calculate_retirement_savings ───────────────────────────────────
server.tool('calculate_retirement_savings', 'Calculates retirement contributions, catch-up eligibility, tax implications, and a projected balance at retirement for the given salary, age, and years to retirement.', {
    salary: zod_1.z.number().min(1).max(10_000_000),
    age: zod_1.z.number().int().min(18).max(80).describe('Current age. Age ≥ 50 enables catch-up contributions.'),
    years_to_retirement: zod_1.z.number().int().min(1).max(50),
    filing_status: filingStatusEnum,
    state: stateEnum.optional().describe("State for net income calculation. Defaults to 'no_state_tax'."),
    contribution_percent: zod_1.z.number().min(0).max(100).optional()
        .describe('401(k) contribution as a percentage of gross salary.'),
    max_out_401k: zod_1.z.boolean().optional(),
    employer_match_percent: zod_1.z.number().min(0).max(100).optional(),
    ira_contribution: zod_1.z.number().min(0).optional().describe('Annual IRA contribution in USD.'),
    ira_type: iraTypeEnum,
    hsa_contribution: zod_1.z.number().min(0).optional().describe('Annual HSA contribution in USD.'),
    expected_annual_return: zod_1.z.number().min(0).max(1).optional()
        .describe('Expected annual investment return (0–1, e.g. 0.07 for 7%). Defaults to 0.07.'),
}, async (args) => {
    try {
        const result = (0, calculate_retirement_savings_1.calculateRetirementSavings)(args);
        return jsonText(result);
    }
    catch (err) {
        return errorText(`calculate_retirement_savings failed: ${String(err)}`);
    }
});
// ── Tool 4: get_recommendations ────────────────────────────────────────────
server.tool('get_recommendations', 'Generates a prioritized list of financial recommendations based on a budget profile. Analyzes housing ratio, savings rate, emergency fund, retirement contributions, debt burden, and spending balance.', {
    salary: zod_1.z.number().min(1).max(10_000_000),
    state: stateEnum,
    filing_status: filingStatusEnum,
    age: zod_1.z.number().int().min(18).max(99).optional(),
    housing_mode: housingModeEnum,
    expenses: expensesSchema,
    savings: savingsSchema,
}, async (args) => {
    try {
        const result = (0, get_recommendations_1.getRecommendations)(args);
        return jsonText(result);
    }
    catch (err) {
        return errorText(`get_recommendations failed: ${String(err)}`);
    }
});
// ── Tool 5: compare_scenarios ──────────────────────────────────────────────
const scenarioItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    description: zod_1.z.string().max(300).optional(),
    salary: zod_1.z.number().min(1).max(10_000_000),
    state: stateEnum,
    filing_status: filingStatusEnum,
    age: zod_1.z.number().int().min(18).max(99).optional(),
    housing_mode: housingModeEnum,
    expenses: expensesSchema,
    savings: savingsSchema,
});
server.tool('compare_scenarios', 'Compares 2–4 named budget scenarios side by side. Returns a breakdown for each scenario with net income, taxes, expense totals, savings rates, budget health score, and a diff table relative to the first (baseline) scenario.', {
    scenarios: zod_1.z.array(scenarioItemSchema).min(2).max(4)
        .describe('List of budget scenarios to compare. The first item is the baseline.'),
}, async (args) => {
    try {
        const result = (0, compare_scenarios_1.compareScenarios)(args);
        return jsonText(result);
    }
    catch (err) {
        return errorText(`compare_scenarios failed: ${String(err)}`);
    }
});
// ─── Start server ──────────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // MCP server is now listening on stdin/stdout
}
main().catch((err) => {
    process.stderr.write(`DynamicBudget MCP server error: ${String(err)}\n`);
    process.exit(1);
});

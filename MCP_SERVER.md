# DynamicBudget MCP Server

> **Status:** E10-T3 complete — MCP server built, tested, and ready for Claude Desktop integration (E10-T4).

The DynamicBudget MCP server exposes five personal-finance calculation tools to AI assistants (Claude, ChatGPT, etc.) via the [Model Context Protocol](https://modelcontextprotocol.io). The same calculation engine that powers the DynamicBudget web app is now available for natural-language queries.

---

## Quick Start

### 1. Build the server

```bash
npm run build:mcp
```

This compiles the TypeScript source in `src/mcp-server/` to `dist/mcp-server/` using a dedicated `tsconfig.json`.

### 2. Run manually (test)

```bash
npm run mcp:start
```

The server listens on stdin/stdout (MCP stdio transport). It will appear idle until an AI client sends a request.

### 3. Register with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your OS:

```json
{
  "mcpServers": {
    "dynamicbudget": {
      "command": "node",
      "args": ["/absolute/path/to/DynamicBudget/dist/mcp-server/src/mcp-server/index.js"]
    }
  }
}
```

Restart Claude Desktop. The five DynamicBudget tools will appear in the tools list.

---

## Available Tools

| Tool | Description | Required Inputs |
|------|-------------|-----------------|
| `calculate_monthly_budget` | Full monthly budget breakdown | `salary`, `state` |
| `analyze_state_move` | State relocation financial impact | `current_state`, `target_state`, `salary` |
| `calculate_retirement_savings` | 401(k)/IRA projections | `salary`, `age`, `years_to_retirement` |
| `get_recommendations` | Prioritized financial advice | `salary`, `state` |
| `compare_scenarios` | Side-by-side scenario comparison | `scenarios` (2–4 items) |

See [`mcp/MCP_TOOLS.md`](../mcp/MCP_TOOLS.md) for the full input/output reference and example AI prompts.

---

## Example AI Prompts

Once registered with Claude Desktop, try asking:

- *"What's my net monthly income if I earn $150k in Texas?"*
- *"Should I move from California to Texas on my $120k salary?"*
- *"Should I max out my 401k at age 38 earning $95k?"*
- *"Compare these three budget scenarios for me: current CA budget, moving to TX, and moving to TX + maxing out 401k."*
- *"What financial recommendations do you have for someone earning $80k in New York with $2,500/mo rent?"*

---

## File Structure

```
src/mcp-server/
  index.ts                    — MCP server entry point (tool registration + stdio transport)
  adapters.ts                 — MCP params → BudgetInputs converter
  package.json                — Server metadata
  tsconfig.json               — Standalone TypeScript build config
  tools/
    calculate_monthly_budget.ts
    analyze_state_move.ts
    calculate_retirement_savings.ts
    get_recommendations.ts
    compare_scenarios.ts
  __tests__/
    mcp-tools.test.ts         — 31 integration tests (Jest)
```

---

## Development

**Run tests:**
```bash
npx jest src/mcp-server
```

**Rebuild after changes:**
```bash
npm run build:mcp
```

**Dependencies** (installed at repo root):
- `@modelcontextprotocol/sdk@1.30.1` — MCP server framework
- `zod@4.6.5` — Input validation / schema definition

---

## Architecture

All five tools are **stateless** — each call is fully self-contained. The server:

1. Receives a tool call over stdio (JSON-RPC from the AI client)
2. Validates inputs against a zod schema
3. Converts the flat MCP params to a `BudgetInputs` object via `adapters.ts`
4. Calls the same pure calculation functions used by the web app
5. Returns a structured JSON response as MCP text content

There is no session state, no database, and no network calls. The entire calculation runs in-process.

---

## Next Steps

- **E10-T4:** Test with Claude Desktop and ChatGPT — verify each tool with real AI prompts, collect feedback, fix any edge cases
- **E10-T5:** Document and publish — npm package (`@dynamicbudget/mcp-server`), user guide, examples

# Decision Record: AI Determinism Policy (JEV)

## Status
Proposed

## Context
DynamicBudget will expose AI-assisted planning capabilities through MCP and future in-app decision support. Freeform model responses alone are not sufficient for repeatable budgeting guidance and explainability.

## Decision
Implement AI-assisted recommendations as rule-bound, deterministic outputs backed by a JEV (judgment + expected value) scoring layer.

## Policy Requirements
- Deterministic mode: identical normalized inputs must produce identical outputs
- Policy profiles: conservative, balanced, aggressive
- Versioned scoring policies and assumptions per release
- Explicit tie-breaker rules for ranking stability

## Explainability Requirements
Each recommendation must include a trace with:
- normalized inputs
- assumptions and constraints
- score dimensions and weights
- final ranking rationale

## MVP Outcomes
- Scenario ranking with transparent weighted scoring
- "Why this recommendation?" explanation panel that shows the deterministic trace, assumptions, and score breakdown
- Audit-friendly output suitable for review and debugging

## Consequences
- Increases implementation effort versus freeform prompting
- Improves trust, reproducibility, and QA validation
- Supports safer expansion into financial and accounting integrations

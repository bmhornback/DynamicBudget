# Decision Record: Integration Security Model

## Status
Proposed

## Context
DynamicBudget is expanding toward accounting and transaction integrations (QuickBooks first, then Xero/Wave/CSV/Plaid). Integrations require an explicit security model for auth scope, data access, and sync observability.

## Decision
Use a provider-agnostic connector security baseline for all accounting integrations.

## Security Baseline
- Least-privilege auth scopes per connector capability
- Clear separation of read-only versus write-back permissions
- Manual sync trigger for MVP with explicit status/error reporting
- Auditable sync logs (attempt, outcome, timestamp, connector, account scope)

## Connector Requirements
- Category mapping layer between external chart/accounts and DynamicBudget categories
- Permission drift detection and actionable error messaging
- Credential/token handling aligned to provider best practices
- Capability flags so unsupported write operations cannot be invoked

## MVP Scope (QuickBooks)
- Read-only import of accounts, categories, expenses, and transactions
- User-visible sync status and failure reasons
- No write-back until reconciliation controls are in place

## Phase 2 Controls
- Approved-only write-back
- Reconciliation reports and exception workflows
- Additional connector onboarding through the same security baseline

## Consequences
- Slower initial integration pace due to stronger controls
- Better compliance posture and lower risk from connector expansion
- Reusable security posture across managed and self-hosted backend options

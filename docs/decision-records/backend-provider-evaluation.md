# Decision Record: Backend Provider Evaluation

## Status
Proposed

## Context
DynamicBudget is a static-first application and cannot depend on an in-repo runtime server. Any cloud sync feature must run through provider SDKs or externally managed APIs. Prior roadmap text referenced Supabase/Firebase directly, but long-term scale and cost requirements require a provider-agnostic approach.

## Decision
Adopt a backend provider abstraction before selecting a default provider for cloud sync.

## Evaluation Criteria
- Total cost at scale (storage, egress, auth MAU, realtime usage)
- Data model fit (relational vs document)
- Security/compliance controls (RLS/ACL, audit logs, key management)
- Operational complexity (managed vs self-hosted responsibility)
- Vendor lock-in and migration risk

## Candidate Tracks
- Managed: Supabase, Firebase, AWS Amplify/AppSync/Cognito, Azure Static Web Apps + managed data
- Open-source/self-hosted: Appwrite, PocketBase, Postgres + Auth stack

## Required Deliverable
Create a provider scorecard with weighted criteria and issue a recommendation for three stages:
1. MVP
2. Growth
3. Enterprise

## Consequences
- Delays implementation-specific coupling until architecture is validated
- Reduces migration risk when scale or compliance requirements change
- Requires a connector/adapter interface before auth/storage/sync implementation proceeds

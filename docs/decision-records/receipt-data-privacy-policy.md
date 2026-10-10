# Decision Record: Receipt Data & Privacy Policy

## Status
Proposed

## Context
Receipt OCR is planned to accelerate spending entry. This introduces image handling, extracted financial data, and potential duplicates that require explicit user controls and privacy-safe defaults.

## Decision
Ship receipt ingestion as an optional feature with explicit confirmation before budget writes and clearly documented storage modes.

## Data Handling Modes
1. Local-only mode
   - Receipt images and extracted fields stay on-device
   - No cloud transfer required
2. Encrypted cloud mode (when cloud sync is enabled)
   - Receipt assets encrypted at rest
   - Access scoped to authenticated owner policies

## Product Safeguards
- OCR confidence thresholds with low-confidence review prompts
- Full manual correction before commit
- Duplicate detection using merchant/date/amount heuristics
- User-visible source metadata (receipt ID, ingest timestamp)

## Retention and Deletion
- Users can delete individual receipt assets and derived entries
- Export and deletion behavior must be documented alongside provider policies
- No silent retention beyond declared product behavior

## Consequences
- Adds UX steps before write operations, reducing accidental bad data
- Creates clear privacy expectations for local and cloud workflows
- Requires policy alignment with each selected backend provider

# Database Agent — Task Specification

## Purpose
Implement the PostgreSQL schema for the OnedriveAudit application.

## Inputs
- Data model definitions
- schemas/ folder

## Tasks
1. Create `schemas/db-schema.sql` containing:
   - drive_items
   - change_events
   - delta_state
   - webhook_subscriptions
2. Add constraints:
   - Primary keys
   - Foreign keys
   - CHECK constraints
3. Add indexes:
   - drive_items(parent_id)
   - change_events(drive_item_id)
4. Add optional migration scripts (if using a migration tool).
5. Validate schema against PostgreSQL.

## Outputs
- SQL schema file
- Optional migration scripts

## Success Criteria
- Schema loads cleanly into PostgreSQL.
- All constraints and relationships validated.

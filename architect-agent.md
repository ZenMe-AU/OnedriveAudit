# Architect Agent — Task Specification

## Purpose
Define the complete architecture, folder structure, TypeScript models, and documentation for the OnedriveAudit system.

## Inputs
- Project metadata
- Data model specification
- Architecture overview
- UML descriptions

## Tasks
1. Generate the full folder structure:
   ```
   src/functions/
   src/services/
   src/models/
   src/config/
   src/utils/
   docs/
   schemas/
   tests/
   ```
2. Create TypeScript model definitions:
   - DriveItem
   - ChangeEvent
   - DeltaState
   - WebhookSubscription
   - Enums
3. Create interface stubs for:
   - Graph client
   - Delta processor
   - Subscription service
   - PostgreSQL repositories
4. Generate documentation:
   - `docs/architecture.md`
   - `docs/uml-sequence-function-app.md`
   - `docs/uml-class-data-model.md`
5. Ensure TypeScript compiles with empty stubs.

## Outputs
- Folder structure
- TypeScript model/interface stubs
- Architecture documentation

## Success Criteria
- Project compiles successfully.
- Documentation accurately reflects system architecture.

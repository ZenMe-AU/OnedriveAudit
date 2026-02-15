# Technical Architect Agent — Task Specification

## Purpose
Define the technical design, coding standards, data models, and interface specifications for the OnedriveAudit system.

## Inputs
- Solution architecture from Solution Architect
- Technology stack requirements
- Data model specifications

## Tasks
1. Create TypeScript model definitions:
   - DriveItem
   - ChangeEvent
   - DeltaState
   - WebhookSubscription
   - Enums and supporting types

2. Create interface stubs for:
   - Graph client
   - Delta processor
   - Subscription service
   - PostgreSQL repositories

3. Generate technical documentation:
   - `docs/uml-class-data-model.md` - Data model class diagrams
   - TypeScript interface specifications
   - API contracts between components

4. Define coding standards:
   - TypeScript conventions
   - Naming conventions
   - Error handling patterns
   - Testing requirements
   - Documentation standards

5. Ensure TypeScript compiles with empty stubs.

## Outputs
- TypeScript model/interface stubs
- Data model documentation
- Coding standards documentation
- Technical design specifications

## Success Criteria
- Project compiles successfully with all type definitions.
- All interfaces are clearly defined with proper types.
- Coding standards are documented and followed.
- Data models accurately represent business requirements.

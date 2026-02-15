# Solution Architect Agent — Task Specification

## Purpose
Define the overall solution architecture, documentation, and ensure alignment between all agents working on the OnedriveAudit system.

## Inputs
- Project metadata
- Business requirements
- System constraints
- Integration requirements

## Tasks
1. Define high-level architecture:
   - System components and their interactions
   - Data flow between components
   - Integration points with external systems (Microsoft Graph, Azure services)
   - Deployment architecture

2. Generate solution documentation:
   - `docs/architecture.md` - Overall system architecture
   - `docs/uml-sequence-function-app.md` - Sequence diagrams for function flows
   - Component interaction diagrams

3. Ensure agent alignment:
   - Define clear interfaces between agent deliverables
   - Coordinate dependencies between agents
   - Review and validate that all agents' work integrates cohesively

4. Create folder structure:
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

## Outputs
- High-level architecture documentation
- Component interaction diagrams
- Folder structure
- Agent coordination guidelines

## Success Criteria
- All agents understand their responsibilities and dependencies.
- Documentation clearly explains the overall solution.
- System components integrate seamlessly.

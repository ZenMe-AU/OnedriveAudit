# QA/Test Agent — Task Specification

## Purpose
Implement unit and integration tests for the OnedriveAudit application.

## Inputs
- Backend implementation
- Data model
- Test requirements

## Tasks

### Unit Tests
- deltaProcessor logic
- graphClient pagination
- repository CRUD

### Integration Tests
- Mock Graph delta responses:
  - create
  - rename
  - move
  - delete
- Validate DB state after processing

### Test Structure
```
tests/unit/*.test.ts
tests/integration/*.test.ts
```

## Outputs
- Complete test suite

## Success Criteria
- All tests pass.
- Coverage ≥ 70%.

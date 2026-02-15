# Backend Implementation Agent — Task Specification

## Purpose
Implement all Azure Functions, services, and repositories for the OnedriveAudit application.

## Inputs
- Architect Agent stubs
- Database schema
- Terraform outputs

## Tasks

### Implement Azure Functions
1. **startRoutine.ts**
   - Authenticate to Graph
   - Ensure webhook subscription
   - Perform initial delta sync
   - Store delta token

2. **onOneDriveWebhookNotification.ts**
   - Handle validation
   - Validate clientState
   - Queue delta processing
   - Return 200 immediately

3. **processDeltaBatch.ts**
   - Read delta token
   - Call Graph delta endpoint
   - Upsert DriveItem
   - Detect rename/move/delete
   - Insert ChangeEvent
   - Update delta token

### Implement Services
- graphClient.ts
- deltaProcessor.ts
- subscriptionService.ts
- dbClient.ts

### Implement Repositories
- driveItemRepository.ts
- changeEventRepository.ts
- deltaStateRepository.ts
- webhookSubscriptionRepository.ts

## Outputs
- Fully implemented TypeScript backend

## Success Criteria
- Functions run locally and in Azure.
- Delta processing works end‑to‑end.

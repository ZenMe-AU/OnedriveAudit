# **📘 OnedriveAudit – Multi‑Agent Task Pack**
### *Complete Agent Instructions + Root README in One File*

---

# **ROOT README.md**

```markdown
# OnedriveAudit

A serverless Azure Functions application written in **Node.js + TypeScript** that tracks **OneDrive folder and file structure changes** (create, rename, move, delete) using the **Microsoft Graph delta API** and **webhooks**, storing all state and history in **Azure PostgreSQL**. Infrastructure is provisioned using **Terraform**.

---

## 🚀 Project Goals

- Maintain a real‑time view of OneDrive structure.
- Detect and record:
  - File/folder creation
  - Renames
  - Moves
  - Deletions
- Persist all events and current state in PostgreSQL.
- Use delta tokens for efficient incremental sync.
- Use webhooks for near‑real‑time updates.

---

## 🏗️ Architecture Overview

- **Azure Functions** (Node.js + TypeScript)
  - `startRoutine`
  - `onOneDriveWebhookNotification`
  - `processDeltaBatch`
- **Microsoft Graph**
  - Delta endpoint
  - Webhook subscription
- **Azure PostgreSQL**
  - drive_items
  - change_events
  - delta_state
  - webhook_subscriptions
- **Terraform**
  - Function App
  - Storage Account
  - PostgreSQL
  - Networking

---

## 📁 Folder Structure

```
src/
  functions/
  services/
  models/
  config/
  utils/

schemas/
terraform/
docs/
tests/
```

---

## 🧩 Multi‑Agent Build Process

This project is built using six cooperating AI agents:

1. Repo Creation Agent  
2. Architect Agent  
3. Database Agent  
4. Terraform IaC Agent  
5. Backend Implementation Agent  
6. QA/Test Agent  

Each agent has a dedicated task file in this document.

---

## 📝 License

MIT License. See `LICENSE` for details.
```

---

# **TASK FILE 1 — repo-creation.md**

```markdown
# Repo Creation Agent — Task Specification

## Purpose
Create the initial public repository and foundational project structure for the OnedriveAudit application.

## Repository Metadata
- **GitHub Organization:** Zenme-au
- **Repository Name:** OnedriveAudit
- **Visibility:** Public
- **License:** MIT
- **Primary Language:** Node.js + TypeScript
- **Runtime:** Azure Functions
- **Database:** Azure PostgreSQL
- **IaC:** Terraform

## Tasks
1. Create a new public repository under `Zenme-au/OnedriveAudit`.
2. Add the MIT License (`LICENSE` file).
3. Generate `.gitignore` for:
   - Node.js
   - Terraform
   - VS Code
4. Initialize a Node.js + TypeScript project:
   - `package.json`
   - `tsconfig.json`
5. Create the base folder structure:
   ```
   src/
   terraform/
   schemas/
   docs/
   tests/
   ```
6. Add the project README.md (included in this file).
7. Commit and push all initial files.

## Outputs
- Public repo with initial structure and metadata.
- README.md and LICENSE included.
- Node.js + TypeScript project initialized.

## Success Criteria
- Repo exists and is publicly accessible.
- Project installs cleanly with `npm install`.
- Folder structure matches specification.
```

---

# **TASK FILE 2 — architect-agent.md**

```markdown
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
```

---

# **TASK FILE 3 — database-agent.md**

```markdown
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
```

---

# **TASK FILE 4 — terraform-agent.md**

```markdown
# Terraform IaC Agent — Task Specification

## Purpose
Provision all Azure infrastructure required for the OnedriveAudit application.

## Inputs
- Terraform requirements
- Database schema (for connection strings)

## Tasks
1. Create Terraform configuration files:
   - main.tf
   - variables.tf
   - outputs.tf
   - functionapp.tf
   - postgres.tf
   - storage.tf
2. Provision:
   - Azure Resource Group
   - Azure Storage Account
   - Azure Function App (Node.js)
   - Azure PostgreSQL server
3. Configure:
   - Networking
   - Firewall rules
   - App settings for Function App
4. Output:
   - Function App URL
   - PostgreSQL connection string

## Outputs
- Complete Terraform IaC stack

## Success Criteria
- `terraform plan` runs without errors.
- `terraform apply` provisions all resources successfully.
```

---

# **TASK FILE 5 — backend-agent.md**

```markdown
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
```

---

# **TASK FILE 6 — qa-agent.md**

```markdown
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
```

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

1. **Repo Creation Agent** - See [repo-creation.md](./repo-creation.md)
2. **Architect Agent** - See [architect-agent.md](./architect-agent.md)
3. **Database Agent** - See [database-agent.md](./database-agent.md)
4. **Terraform IaC Agent** - See [terraform-agent.md](./terraform-agent.md)
5. **Backend Implementation Agent** - See [backend-agent.md](./backend-agent.md)
6. **QA/Test Agent** - See [qa-agent.md](./qa-agent.md)

Each agent has a dedicated task specification file linked above.

---

## 📝 License

MIT License. See `LICENSE` for details.

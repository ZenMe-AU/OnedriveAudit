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

This project is built using seven cooperating AI agents:

1. **Repo Creation Agent** - See [repo-creation.md](./repo-creation.md)
2. **Solution Architect Agent** - See [solution-architect-agent.md](./solution-architect-agent.md)
3. **Technical Architect Agent** - See [technical-architect-agent.md](./technical-architect-agent.md)
4. **Database Agent** - See [database-agent.md](./database-agent.md)
5. **Terraform IaC Agent** - See [terraform-agent.md](./terraform-agent.md)
6. **Backend Implementation Agent** - See [backend-agent.md](./backend-agent.md)
7. **QA/Test Agent** - See [qa-agent.md](./qa-agent.md)

Each agent has a dedicated task specification file linked above.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ZenMe-AU/OnedriveAudit.git
cd OnedriveAudit
```

2. Install dependencies:
```bash
npm install
```

### Development Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run typecheck` - Type-check without emitting files
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Lint and auto-fix issues

### Project Structure

```
src/
  functions/      # Azure Functions entry points
  services/       # Business logic and service layer
  models/         # TypeScript data models and interfaces
  config/         # Configuration management
  utils/          # Utility functions and helpers

schemas/          # Database schemas
terraform/        # Infrastructure as Code
docs/             # Architecture and design documentation
tests/            # Unit and integration tests
  unit/           # Unit tests
  integration/    # Integration tests
```

---

## 📊 Project Status

**Current Phase:** Initial Planning (5% Complete)  
**Last Updated:** February 15, 2026

For detailed project status and next steps, see:
- **[PROJECT-STATUS.md](./PROJECT-STATUS.md)** - Comprehensive status report with detailed assessment of all agents
- **[NEXT-STEPS.md](./NEXT-STEPS.md)** - Quick reference guide with actionable next steps and code samples

---

## 📝 License

MIT License. See `LICENSE` for details.

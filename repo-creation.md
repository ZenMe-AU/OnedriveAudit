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

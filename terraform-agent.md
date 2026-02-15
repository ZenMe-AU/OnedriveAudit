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

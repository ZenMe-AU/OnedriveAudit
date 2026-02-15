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
   - Basic app settings for Function App (non-secret values only)
4. Output:
   - Function App URL
   - PostgreSQL server name (connection string constructed manually with credentials)

## Important Notes

**Secrets Management:**
- Secrets (GRAPH_CLIENT_SECRET, DATABASE_URL, WEBHOOK_CLIENT_STATE) are NOT managed by Terraform
- These must be configured manually in Azure Function App Settings after deployment
- Never store secrets in Terraform state or configuration files

**Post-Deployment Manual Steps:**
After running `terraform apply`, secrets must be configured via Azure Portal or Azure CLI:
```bash
az functionapp config appsettings set --name <function-app-name> \
  --resource-group <resource-group-name> \
  --settings GRAPH_CLIENT_SECRET=<value> DATABASE_URL=<value> WEBHOOK_CLIENT_STATE=<value>
```

## Outputs
- Complete Terraform IaC stack (without Key Vault)
- Documentation for manual secret configuration

## Success Criteria
- `terraform plan` runs without errors.
- `terraform apply` provisions all resources successfully.
- Documentation includes clear instructions for manual secret configuration.

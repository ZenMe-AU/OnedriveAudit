# OnedriveAudit - Deployment Guide

**Version:** 1.0  
**Last Updated:** February 15, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Azure Infrastructure Deployment](#azure-infrastructure-deployment)
5. [Manual Secret Configuration](#manual-secret-configuration)
6. [Database Setup](#database-setup)
7. [Function Deployment](#function-deployment)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks through deploying the OnedriveAudit application to Azure. The deployment process includes:

1. Provisioning Azure infrastructure with Terraform
2. Manually configuring secrets in Function App Settings
3. Setting up the PostgreSQL database
4. Deploying the Function App code

**Important:** Secrets are NOT managed by Terraform and must be configured manually to maintain security best practices.

---

## Prerequisites

### Required Tools

- **Azure CLI** - v2.50.0 or later
- **Terraform** - v1.5.0 or later
- **Node.js** - v18.x or later
- **npm** - v9.x or later
- **Azure Functions Core Tools** - v4.x

### Azure Requirements

- Active Azure subscription
- Contributor access to create resources
- Azure AD App Registration with Microsoft Graph permissions:
  - `Files.Read.All` (Application permission)
  - `Sites.Read.All` (Application permission)

### Obtain Azure AD Credentials

Before deployment, create an Azure AD App Registration:

1. Navigate to Azure Portal → Azure Active Directory → App Registrations
2. Click "New registration"
3. Name: "OnedriveAudit"
4. Click "Register"
5. Note the **Application (client) ID** - This is your `GRAPH_CLIENT_ID`
6. Note the **Directory (tenant) ID** - This is your `GRAPH_TENANT_ID`
7. Go to "Certificates & secrets" → "New client secret"
8. Create a secret and note the **Value** - This is your `GRAPH_CLIENT_SECRET`
9. Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Application permissions"
10. Add `Files.Read.All` and `Sites.Read.All`
11. Click "Grant admin consent"

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ZenMe-AU/OnedriveAudit.git
cd OnedriveAudit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Local Secrets

**Option A: Using .env file (recommended for development)**

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:

```bash
# Microsoft Graph API Configuration
GRAPH_CLIENT_ID=<your-client-id>
GRAPH_CLIENT_SECRET=<your-client-secret>
GRAPH_TENANT_ID=<your-tenant-id>

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/onedriveaudit?sslmode=require

# Webhook Configuration (generate with: openssl rand -hex 32)
WEBHOOK_CLIENT_STATE=<32-char-random-string>
```

**Option B: Using local.settings.json (Azure Functions local)**

```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json` and fill in your actual values in the `Values` section.

**Important:** Never commit `.env` or `local.settings.json` to the repository!

### 4. Set Up Local PostgreSQL

```bash
# Install PostgreSQL (if not already installed)
# macOS
brew install postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14

# Start PostgreSQL
# macOS
brew services start postgresql@14

# Ubuntu/Debian
sudo systemctl start postgresql

# Create database
createdb onedriveaudit

# Run migrations
npm run prisma:migrate:deploy
```

### 5. Run Functions Locally

```bash
# Start Azure Functions runtime
npm start

# Functions will be available at:
# http://localhost:7071/api/startRoutine
# http://localhost:7071/api/onOneDriveWebhookNotification
# http://localhost:7071/api/processDeltaBatch
```

---

## Azure Infrastructure Deployment

### 1. Configure Terraform Backend (Optional)

Edit `terraform/backend.tf` to use Azure Storage for state:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "onedriveaudit.tfstate"
  }
}
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Review Plan

```bash
terraform plan -out=tfplan
```

Review the resources to be created:
- Resource Group
- Storage Account
- Function App (Consumption Plan)
- PostgreSQL Flexible Server
- Monitoring (Application Insights)

### 4. Apply Infrastructure

```bash
terraform apply tfplan
```

Note the outputs:
- `function_app_name` - Name of the Function App
- `function_app_url` - URL of the Function App
- `postgres_server_name` - Name of the PostgreSQL server

---

## Manual Secret Configuration

**Critical Step:** After Terraform completes, you MUST manually configure secrets.

### Method 1: Azure Portal (Recommended)

1. Navigate to Azure Portal
2. Go to your Function App (e.g., `func-onedriveaudit-prod`)
3. Select "Configuration" from the left menu
4. Under "Application settings", click "+ New application setting"
5. Add each secret:

| Name | Value | Source |
|------|-------|--------|
| `GRAPH_CLIENT_SECRET` | `<client-secret-from-azure-ad>` | Azure AD App Registration |
| `DATABASE_URL` | `postgresql://username:password@<server-name>.postgres.database.azure.com:5432/onedriveaudit?sslmode=require` | Terraform output + credentials |
| `WEBHOOK_CLIENT_STATE` | `<random-32-char-string>` | Generate: `openssl rand -hex 32` |

6. Click "Save" at the top

### Method 2: Azure CLI

```bash
# Set variables
FUNCTION_APP_NAME="func-onedriveaudit-prod"
RESOURCE_GROUP="rg-onedriveaudit-prod"
GRAPH_CLIENT_SECRET="<your-client-secret>"
DATABASE_URL="postgresql://username:password@server.postgres.database.azure.com:5432/onedriveaudit?sslmode=require"
WEBHOOK_CLIENT_STATE=$(openssl rand -hex 32)

# Configure secrets
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "GRAPH_CLIENT_SECRET=$GRAPH_CLIENT_SECRET" \
    "DATABASE_URL=$DATABASE_URL" \
    "WEBHOOK_CLIENT_STATE=$WEBHOOK_CLIENT_STATE"
```

### Verify Secret Configuration

```bash
# List all settings (secrets will show as hidden)
az functionapp config appsettings list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

---

## Database Setup

### 1. Configure Firewall Rules

Allow your IP address to access PostgreSQL:

```bash
# Get your public IP
MY_IP=$(curl -s ifconfig.me)

# Add firewall rule
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name psql-onedriveaudit-prod \
  --rule-name "AllowMyIP" \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

### 2. Run Migrations

```bash
# From the project root
npm run prisma:migrate:deploy
```

---

## Function Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Deploy to Azure

**Method 1: Azure Functions Core Tools**

```bash
func azure functionapp publish $FUNCTION_APP_NAME
```

**Method 2: Azure CLI (Zip Deploy)**

```bash
# Create deployment package
npm run build
zip -r deploy.zip . -x "node_modules/*" -x ".git/*" -x "terraform/*"

# Deploy
az functionapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --src deploy.zip
```

### 3. Verify Deployment

```bash
# Check deployment status
az functionapp deployment list \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME

# View logs
az functionapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME
```

---

## Verification

### 1. Test HTTP Functions

```bash
# Get the function URL
FUNCTION_URL=$(az functionapp show \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --query "defaultHostName" -o tsv)

# Test startRoutine
curl https://$FUNCTION_URL/api/startRoutine
```

### 2. Check Application Insights

1. Navigate to Azure Portal → Your Function App → Application Insights
2. Go to "Live Metrics" to see real-time telemetry
3. Check "Failures" for any errors

### 3. Verify Database Connection

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check tables
\dt

# Check for initial data
SELECT COUNT(*) FROM drive_items;
SELECT COUNT(*) FROM change_events;

# Exit
\q
```

---

## Troubleshooting

### Issue: Function App can't connect to PostgreSQL

**Solution:** Check firewall rules

```bash
# Add Azure Services rule
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name psql-onedriveaudit-prod \
  --rule-name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Issue: Microsoft Graph authentication fails

**Solution:** Verify client credentials

1. Check `GRAPH_CLIENT_SECRET` is correct in Function App Settings
2. Verify the secret hasn't expired in Azure AD
3. Confirm API permissions are granted with admin consent

### Issue: Secrets not showing in Function App

**Solution:** Check Application Settings

```bash
# List settings to verify they're set
az functionapp config appsettings list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='GRAPH_CLIENT_SECRET' || name=='DATABASE_URL' || name=='WEBHOOK_CLIENT_STATE'].{Name:name, SlotSetting:slotSetting}" -o table
```

### Issue: Function cold start timeout

**Solution:** Consider upgrading to Premium plan or keep function warm

```bash
# Enable Always On (requires Premium plan)
az functionapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --always-on true
```

---

## Secret Rotation

### Rotating GRAPH_CLIENT_SECRET

1. Create a new client secret in Azure AD App Registration
2. Update Function App Settings with the new secret
3. Test the function
4. Delete the old secret from Azure AD

```bash
# Update secret
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "GRAPH_CLIENT_SECRET=<new-secret>"
```

### Rotating DATABASE_URL Password

1. Change the password in PostgreSQL
2. Update the connection string in Function App Settings
3. Restart the Function App

```bash
# Update connection string
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "DATABASE_URL=postgresql://username:newpassword@server.postgres.database.azure.com:5432/onedriveaudit?sslmode=require"

# Restart function app
az functionapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME
```

### Rotating WEBHOOK_CLIENT_STATE

1. Generate a new random secret
2. Update Function App Settings
3. Renew webhook subscription with new client state

```bash
# Generate new secret
NEW_CLIENT_STATE=$(openssl rand -hex 32)

# Update setting
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "WEBHOOK_CLIENT_STATE=$NEW_CLIENT_STATE"

# Call startRoutine to renew subscription
curl https://$FUNCTION_URL/api/startRoutine
```

---

## Security Best Practices

1. **Never commit secrets to the repository**
   - Use `.env` and `local.settings.json` for local development
   - Both files are in `.gitignore`

2. **Use strong secrets**
   - Minimum 32 characters for `WEBHOOK_CLIENT_STATE`
   - Use Azure AD secret generator for `GRAPH_CLIENT_SECRET`

3. **Rotate secrets regularly**
   - Graph client secrets: Every 6-12 months
   - Database passwords: Every 6-12 months
   - Webhook client state: As needed

4. **Limit database access**
   - Use firewall rules to restrict access
   - Consider using VNet integration for production

5. **Monitor secret usage**
   - Check Application Insights for authentication failures
   - Set up alerts for suspicious activity

---

## Additional Resources

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [Azure PostgreSQL Documentation](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Terraform Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

---

**Document Maintained By:** DevOps Team  
**Last Reviewed:** February 15, 2026

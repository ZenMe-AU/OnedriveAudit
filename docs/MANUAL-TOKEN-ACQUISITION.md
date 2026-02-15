# Manual Token Acquisition Guide

**Version:** 1.0  
**Last Updated:** February 15, 2026  
**Status:** Active

---

## Overview

OnedriveAudit operates in **single-user mode** with delegated permissions. This means the application uses a manually acquired OAuth access token from a specific user account, rather than application-wide permissions. This ensures the app never runs under app-wide permission scopes and provides better security control.

---

## Prerequisites

1. **Azure AD App Registration** configured with:
   - Delegated API Permissions:
     - `Files.Read.All`
     - `Sites.Read.All`
   - Redirect URI configured (e.g., `https://localhost` for device code flow or `https://login.microsoftonline.com/common/oauth2/nativeclient` for native apps)
   - Client ID and Tenant ID noted

2. **User Account** with:
   - Access to the OneDrive to be monitored
   - Appropriate permissions to consent to the delegated permissions

---

## Token Acquisition Methods

### Method 1: Using Microsoft Graph Explorer (Recommended for Testing)

1. Navigate to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Click "Sign in with Microsoft"
3. Sign in with the user account that has access to the OneDrive
4. Consent to the required permissions (`Files.Read.All`, `Sites.Read.All`)
5. Once signed in, click on your profile icon
6. Select "Access token" to view and copy the token
7. Copy the entire token (starts with `eyJ...`)

**Note:** Graph Explorer tokens are short-lived (typically 1 hour). For production use, consider Method 2.

### Method 2: Using Azure CLI (Recommended for Production)

```bash
# Login as the user
az login --tenant <your-tenant-id>

# Acquire token with delegated permissions
az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken \
  --output tsv
```

This will output an access token that you can use.

### Method 3: Using PowerShell with MSAL

```powershell
# Install MSAL.PS module if not already installed
Install-Module -Name MSAL.PS -Scope CurrentUser

# Acquire token interactively
$clientId = "<your-app-registration-client-id>"
$tenantId = "<your-tenant-id>"
$scopes = @("https://graph.microsoft.com/Files.Read.All", "https://graph.microsoft.com/Sites.Read.All")

$token = Get-MsalToken `
  -ClientId $clientId `
  -TenantId $tenantId `
  -Scopes $scopes `
  -Interactive

# Display the access token
$token.AccessToken
```

### Method 4: Using Device Code Flow (For Headless Environments)

```bash
# Use Azure CLI with device code flow
az login --use-device-code --tenant <your-tenant-id>

# Then acquire the token
az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken \
  --output tsv
```

---

## Configuring the Token

### For Local Development

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste the acquired token:
   ```
   GRAPH_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJub25jZSI6...
   ```

3. Never commit the `.env` file (it's already in `.gitignore`)

### For Azure Function App (Production)

1. Navigate to your Function App in the Azure Portal
2. Go to **Configuration** → **Application Settings**
3. Click **+ New application setting**
4. Add the setting:
   - Name: `GRAPH_ACCESS_TOKEN`
   - Value: `<your-acquired-token>`
5. Click **Save** and **Continue** when prompted about restarting the app

**Alternative: Using Azure CLI**

```bash
az functionapp config appsettings set \
  --name <your-function-app-name> \
  --resource-group <your-resource-group> \
  --settings GRAPH_ACCESS_TOKEN="<your-acquired-token>"
```

---

## Token Validation

The `startRoutine` function automatically validates the token when invoked:

1. Attempts to call Microsoft Graph API with the token
2. If successful: Proceeds with webhook setup and delta sync
3. If failed: Stops execution and logs an error with details

**To test token validity manually:**

```bash
# Using curl
curl -X GET "https://graph.microsoft.com/v1.0/me" \
  -H "Authorization: Bearer <your-token>"

# Expected response: User profile information (HTTP 200)
# Invalid token: Authentication error (HTTP 401)
```

---

## Token Expiration and Refresh

### Understanding Token Lifetime

- **Access tokens** are typically valid for 1 hour
- **Refresh tokens** can be used to obtain new access tokens without re-authentication
- OnedriveAudit **does not handle automatic token refresh** (by design, for security)

### When Token Expires

1. The `startRoutine` function will fail with an authentication error
2. Azure Functions will log the error with details
3. The `processDeltaBatch` function will be automatically disabled
4. You must manually acquire a new token and update the app settings

### Recommended Process for Production

1. **Monitor token expiration**: Set up alerts in Azure Monitor for authentication failures
2. **Periodic token refresh**: Schedule a manual token refresh process (e.g., weekly)
3. **Document the process**: Ensure operations team knows how to refresh the token
4. **Test the process**: Verify that refreshing the token and restarting the Function App works

---

## Security Considerations

### Best Practices

1. **Principle of Least Privilege**
   - Use an account with minimal necessary permissions
   - Only grant `Files.Read.All` and `Sites.Read.All` delegated permissions
   - Do not use a Global Administrator account

2. **Token Storage**
   - Never commit tokens to source control
   - Never log tokens in application logs
   - Store tokens only in Azure Function App Settings or local `.env` files
   - Use Azure Key Vault for additional security (optional enhancement)

3. **Token Rotation**
   - Implement a regular token rotation schedule (e.g., weekly or monthly)
   - Document the rotation process in your operations manual
   - Test token rotation in a non-production environment first

4. **Monitoring and Alerting**
   - Set up Azure Monitor alerts for authentication failures
   - Monitor for unusual API usage patterns
   - Track token usage and expiration

### What to Do If Token Is Compromised

1. **Immediate Actions:**
   - Revoke the token in Azure AD (user's sessions)
   - Acquire a new token with a different account if possible
   - Update Azure Function App Settings with the new token
   - Restart the Function App

2. **Investigation:**
   - Review Azure Monitor logs for unauthorized access
   - Check Microsoft Graph API usage logs
   - Identify how the token may have been compromised

3. **Prevention:**
   - Review access controls and permissions
   - Ensure `.env` files are not committed to source control
   - Verify that app settings are properly secured in Azure

---

## Troubleshooting

### Token Acquisition Fails

**Error:** "AADSTS50020: User account from identity provider does not exist in tenant"
- **Solution:** Ensure you're using the correct tenant ID and the user exists in that tenant

**Error:** "AADSTS65001: The user or administrator has not consented"
- **Solution:** User must consent to the delegated permissions. Re-run the token acquisition with consent prompt:
  ```bash
  az login --tenant <tenant-id> --allow-no-subscriptions
  ```

### Token Validation Fails in Function App

**Error:** "401 Unauthorized" when calling Microsoft Graph
- **Cause:** Token expired or invalid
- **Solution:** Acquire a new token and update app settings

**Error:** "403 Forbidden" when calling Microsoft Graph
- **Cause:** Token doesn't have required permissions
- **Solution:** Ensure the user has consented to `Files.Read.All` and `Sites.Read.All`

### Function App Doesn't Pick Up New Token

- **Solution:** Restart the Function App after updating the `GRAPH_ACCESS_TOKEN` setting
  ```bash
  az functionapp restart \
    --name <function-app-name> \
    --resource-group <resource-group>
  ```

---

## Appendix: Token Structure

An OAuth access token is a JWT (JSON Web Token) with three parts:
- **Header:** Token type and algorithm
- **Payload:** Claims (user info, permissions, expiration)
- **Signature:** Verification signature

Example token structure:
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik...  (Header)
.
eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20i...  (Payload)
.
signature-here  (Signature)
```

To inspect a token (for debugging only, never log production tokens):
- Visit [jwt.ms](https://jwt.ms) and paste the token
- Review the claims, especially:
  - `exp`: Expiration time (Unix timestamp)
  - `scp`: Scopes granted to the token
  - `aud`: Audience (should be `https://graph.microsoft.com`)

---

## References

- [Microsoft Graph Authentication Overview](https://docs.microsoft.com/en-us/graph/auth/)
- [Delegated Permissions vs Application Permissions](https://docs.microsoft.com/en-us/graph/auth-v2-user)
- [Azure CLI Authentication](https://docs.microsoft.com/en-us/cli/azure/authenticate-azure-cli)
- [MSAL PowerShell Module](https://github.com/AzureAD/MSAL.PS)

---

**Document Maintained By:** Solution Architect  
**Review Cycle:** Quarterly or when authentication process changes

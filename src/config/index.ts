/**
 * Configuration loader for OnedriveAudit application
 * Loads and validates environment variables
 */

export interface AppConfig {
  // Azure Functions configuration
  functionsWorkerRuntime: string;
  functionsNodeVersion: string;
  
  // Microsoft Graph API configuration (delegated permissions)
  graphClientId: string;
  graphAccessToken: string;
  graphTenantId: string;
  
  // Database configuration
  databaseUrl: string;
  
  // Webhook configuration
  webhookClientState: string;
  
  // Delta processing control
  processDeltaEnabled: boolean;
  
  // Azure Storage
  azureWebJobsStorage?: string;
}

/**
 * Load and validate application configuration from environment variables
 * @throws Error if required configuration is missing or invalid
 */
export function loadConfig(): AppConfig {
  const config: AppConfig = {
    functionsWorkerRuntime: getEnvVar('FUNCTIONS_WORKER_RUNTIME', 'node'),
    functionsNodeVersion: getEnvVar('FUNCTIONS_NODE_VERSION', '18'),
    graphClientId: getEnvVar('GRAPH_CLIENT_ID'),
    graphAccessToken: getEnvVar('GRAPH_ACCESS_TOKEN'),
    graphTenantId: getEnvVar('GRAPH_TENANT_ID'),
    databaseUrl: getEnvVar('DATABASE_URL'),
    webhookClientState: getEnvVar('WEBHOOK_CLIENT_STATE'),
    processDeltaEnabled: getEnvVar('PROCESS_DELTA_ENABLED', 'false').toLowerCase() === 'true',
    azureWebJobsStorage: process.env.AzureWebJobsStorage,
  };
  
  // Validate configuration
  validateConfig(config);
  
  return config;
}

/**
 * Get environment variable with optional default value
 * @param name Environment variable name
 * @param defaultValue Optional default value if variable is not set
 * @returns Environment variable value
 * @throws Error if required variable is not set and no default provided
 */
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  
  return value || defaultValue!;
}

/**
 * Validate configuration values
 * @param config Application configuration
 * @throws Error if configuration is invalid
 */
function validateConfig(config: AppConfig): void {
  // Validate Graph access token format (should be a JWT)
  if (!config.graphAccessToken.startsWith('eyJ')) {
    throw new Error('GRAPH_ACCESS_TOKEN does not appear to be a valid JWT token (should start with "eyJ")');
  }
  
  // Validate webhook client state length
  if (config.webhookClientState.length < 32) {
    throw new Error('WEBHOOK_CLIENT_STATE must be at least 32 characters long');
  }
  
  // Validate database URL format
  if (!config.databaseUrl.startsWith('postgresql://') && !config.databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  // Validate Graph Client ID format (should be a GUID)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRegex.test(config.graphClientId)) {
    throw new Error('GRAPH_CLIENT_ID must be a valid GUID');
  }
  
  // Validate Tenant ID format (should be a GUID)
  if (!guidRegex.test(config.graphTenantId)) {
    throw new Error('GRAPH_TENANT_ID must be a valid GUID');
  }
}

/**
 * Check if delta processing is enabled
 * @returns true if delta processing is enabled, false otherwise
 */
export function isDeltaProcessingEnabled(): boolean {
  return getEnvVar('PROCESS_DELTA_ENABLED', 'false').toLowerCase() === 'true';
}

/**
 * Enable delta processing by updating the environment variable
 * Note: This only updates the in-memory environment variable.
 * For persistent changes, update Azure Function App Settings.
 */
export function enableDeltaProcessing(): void {
  process.env.PROCESS_DELTA_ENABLED = 'true';
}

/**
 * Disable delta processing by updating the environment variable
 * Note: This only updates the in-memory environment variable.
 * For persistent changes, update Azure Function App Settings.
 */
export function disableDeltaProcessing(): void {
  process.env.PROCESS_DELTA_ENABLED = 'false';
}

// Export singleton config instance
let configInstance: AppConfig | null = null;

/**
 * Get singleton configuration instance
 * Loads configuration on first access
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

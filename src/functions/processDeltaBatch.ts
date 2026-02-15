/**
 * processDeltaBatch Azure Function
 * 
 * Queue-triggered function that processes delta changes from OneDrive
 * 
 * Features:
 * - Disabled by default (PROCESS_DELTA_ENABLED=false)
 * - Only enabled after successful startRoutine validation
 * - Auto-disables on authentication failure
 */

import { app, InvocationContext } from '@azure/functions';
import { getConfig, disableDeltaProcessing, isDeltaProcessingEnabled } from '../config';
import { validateToken } from '../utils/tokenValidator';
import { createGraphClient } from '../services/graphClient';
import { createDeltaProcessor } from '../services/deltaProcessor';

export async function processDeltaBatch(
  queueItem: unknown,
  context: InvocationContext
): Promise<void> {
  context.log('=== processDeltaBatch: Processing delta changes ===');

  try {
    // Check if delta processing is enabled
    if (!isDeltaProcessingEnabled()) {
      context.warn('Delta processing is disabled (PROCESS_DELTA_ENABLED=false)');
      context.warn('Skipping delta processing. Run startRoutine to enable.');
      return;
    }

    // Load configuration
    const config = getConfig();

    // Validate OAuth token before processing
    context.log('Validating OAuth token...');
    const tokenValidation = await validateToken(config.graphAccessToken);

    if (!tokenValidation.isValid) {
      // Token is invalid - disable delta processing and stop
      context.error(`OAuth token validation failed: ${tokenValidation.error}`);
      context.error('CRITICAL: Disabling delta processing due to invalid token');
      context.error('ACTION REQUIRED: Acquire a new OAuth token and update GRAPH_ACCESS_TOKEN');
      context.error('Then restart the function app and run startRoutine');

      // Disable delta processing
      disableDeltaProcessing();
      context.log('Delta processing disabled (PROCESS_DELTA_ENABLED=false)');

      return;
    }

    context.log(`Token is valid for user: ${tokenValidation.userPrincipalName}`);

    // Parse queue message
    const message = parseQueueMessage(queueItem);
    context.log(`Processing delta for subscription: ${message.subscriptionId}`);

    // Initialize services
    const graphClient = createGraphClient();
    const deltaProcessor = createDeltaProcessor(graphClient);

    // Get drive ID (in production, this would come from the queue message or subscription)
    const driveId = await graphClient.getUserDriveId();
    context.log(`Drive ID: ${driveId}`);

    // Process delta changes
    context.log('Querying delta changes...');
    const result = await deltaProcessor.processDelta(driveId);

    context.log(`Delta processing completed:`);
    context.log(`  - Items processed: ${result.itemsProcessed}`);
    context.log(`  - Changes detected: ${result.changesDetected}`);
    context.log(`  - Delta token updated: ${result.deltaToken ? 'Yes' : 'No'}`);

    context.log('=== processDeltaBatch: Completed successfully ===');
  } catch (error: any) {
    context.error('=== processDeltaBatch: Error during processing ===');
    context.error(`Error: ${error.message}`);
    context.error(`Stack: ${error.stack}`);

    // Check if error is authentication-related
    if (isAuthenticationError(error)) {
      context.error('Authentication error detected - disabling delta processing');
      disableDeltaProcessing();
      context.log('Delta processing disabled (PROCESS_DELTA_ENABLED=false)');
    }

    // Rethrow to mark the queue message as failed (will be retried by Azure)
    throw error;
  }
}

/**
 * Parse queue message
 * @param queueItem Queue item from Azure Storage Queue
 * @returns Parsed message
 */
function parseQueueMessage(queueItem: unknown): QueueMessage {
  if (typeof queueItem === 'string') {
    return JSON.parse(queueItem);
  }
  return queueItem as QueueMessage;
}

/**
 * Check if an error is authentication-related
 * @param error Error object
 * @returns true if authentication error, false otherwise
 */
function isAuthenticationError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  const statusCode = error.statusCode || 0;

  return (
    statusCode === 401 ||
    statusCode === 403 ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('token')
  );
}

/**
 * Queue message structure
 */
interface QueueMessage {
  subscriptionId: string;
  resource?: string;
  changeType?: string;
  timestamp?: string;
}

// Register the function
// Note: This function is registered but will check PROCESS_DELTA_ENABLED at runtime
app.storageQueue('processDeltaBatch', {
  queueName: 'delta-processing',
  connection: 'AzureWebJobsStorage',
  handler: processDeltaBatch,
});

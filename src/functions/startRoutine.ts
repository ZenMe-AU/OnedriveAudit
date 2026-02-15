/**
 * startRoutine Azure Function
 * 
 * HTTP-triggered function that:
 * 1. Validates the OAuth access token from app settings
 * 2. Creates/renews webhook subscription
 * 3. Performs initial delta sync
 * 4. Enables the processDeltaBatch queue trigger
 * 
 * If token validation fails, the function stops with an error.
 * After failure, restart the function app to re-run this function.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getConfig, enableDeltaProcessing } from '../config';
import { validateToken } from '../utils/tokenValidator';
import { createGraphClient } from '../services/graphClient';
import { createSubscriptionService } from '../services/subscriptionService';
import { createDeltaProcessor } from '../services/deltaProcessor';

export async function startRoutine(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('=== startRoutine: Beginning initialization ===');

  try {
    // Step 1: Load configuration
    context.log('Step 1: Loading configuration...');
    const config = getConfig();
    context.log('Configuration loaded successfully');

    // Step 2: Validate OAuth token
    context.log('Step 2: Validating OAuth access token...');
    const tokenValidation = await validateToken(config.graphAccessToken);

    if (!tokenValidation.isValid) {
      // Token validation failed - stop execution
      const errorMessage = `OAuth token validation failed: ${tokenValidation.error}`;
      context.error(errorMessage);
      context.error('CRITICAL: Function execution stopped due to invalid token');
      context.error('ACTION REQUIRED: Acquire a new OAuth token and update GRAPH_ACCESS_TOKEN in app settings');
      context.error('Then restart the function app to re-run startRoutine');

      return {
        status: 401,
        jsonBody: {
          success: false,
          error: errorMessage,
          message: 'OAuth token validation failed. Please acquire a new token and update app settings.',
          userPrincipalName: null,
        },
      };
    }

    context.log(`Token is valid for user: ${tokenValidation.userPrincipalName}`);

    // Step 3: Initialize services
    context.log('Step 3: Initializing services...');
    const graphClient = createGraphClient();
    const subscriptionService = createSubscriptionService(graphClient);
    const deltaProcessor = createDeltaProcessor(graphClient);
    context.log('Services initialized successfully');

    // Step 4: Get user's drive ID
    context.log('Step 4: Getting user drive ID...');
    const driveId = await graphClient.getUserDriveId();
    context.log(`Drive ID: ${driveId}`);

    // Step 5: Create or renew webhook subscription
    context.log('Step 5: Ensuring webhook subscription...');
    const notificationUrl = getNotificationUrl(request);
    const subscription = await subscriptionService.ensureSubscription(notificationUrl, driveId);
    context.log(`Webhook subscription active: ${subscription.id}`);
    context.log(`Subscription expires: ${subscription.expirationDateTime}`);

    // Step 6: Perform initial delta sync
    context.log('Step 6: Performing initial delta sync...');
    const syncResult = await deltaProcessor.performInitialSync(driveId);
    context.log(`Initial sync completed: ${syncResult.itemsProcessed} items processed, ${syncResult.changesDetected} changes detected`);

    // Step 7: Enable delta processing
    context.log('Step 7: Enabling delta processing...');
    enableDeltaProcessing();
    context.log('Delta processing enabled (PROCESS_DELTA_ENABLED=true)');
    context.log('NOTE: This only affects in-memory environment. For persistent enablement, update app settings.');

    // Success!
    context.log('=== startRoutine: Initialization completed successfully ===');

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Initialization completed successfully',
        userPrincipalName: tokenValidation.userPrincipalName,
        driveId,
        subscription: {
          id: subscription.id,
          expirationDateTime: subscription.expirationDateTime,
        },
        sync: {
          itemsProcessed: syncResult.itemsProcessed,
          changesDetected: syncResult.changesDetected,
        },
        deltaProcessingEnabled: true,
      },
    };
  } catch (error: any) {
    context.error('=== startRoutine: Error during initialization ===');
    context.error(`Error: ${error.message}`);
    context.error(`Stack: ${error.stack}`);

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error.message || 'Unknown error during initialization',
        message: 'Initialization failed. Check logs for details.',
      },
    };
  }
}

/**
 * Get the webhook notification URL
 * @param request HTTP request
 * @returns Notification URL
 */
function getNotificationUrl(request: HttpRequest): string {
  // Try to get from request headers
  const host = request.headers.get('host');
  const scheme = request.headers.get('x-forwarded-proto') || 'https';

  if (host) {
    return `${scheme}://${host}/api/onOneDriveWebhookNotification`;
  }

  // Fallback to environment variable or error
  const fallbackUrl = process.env.WEBHOOK_NOTIFICATION_URL;
  if (fallbackUrl) {
    return fallbackUrl;
  }

  throw new Error('Unable to determine notification URL. Set WEBHOOK_NOTIFICATION_URL in app settings.');
}

// Register the function
app.http('startRoutine', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  handler: startRoutine,
});

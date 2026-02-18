/**
 * onOneDriveWebhookNotification Azure Function
 * 
 * HTTP-triggered function that receives webhook notifications from Microsoft Graph
 * 
 * Handles:
 * 1. Webhook validation requests (initial subscription creation)
 * 2. Change notifications from OneDrive
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getConfig } from '../config';
import { createGraphClient } from '../services/graphClient';
import { createSubscriptionService } from '../services/subscriptionService';

export async function onOneDriveWebhookNotification(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('=== onOneDriveWebhookNotification: Received webhook notification ===');

  try {
    // Check if this is a validation request
    const validationToken = request.query.get('validationToken');

    if (validationToken) {
      // This is a webhook validation request
      context.log('Webhook validation request received');
      context.log('Returning validation token...');

      return {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
        body: validationToken,
      };
    }

    // This is a change notification
    context.log('Change notification received');

    // Parse notification body
    const body = await request.json() as WebhookNotificationPayload;
    context.log(`Received ${body.value?.length || 0} notification(s)`);

    // Validate client state for each notification
    const config = getConfig();
    const graphClient = createGraphClient();
    const subscriptionService = createSubscriptionService(graphClient);

    for (const notification of body.value || []) {
      context.log(`Processing notification for subscription: ${notification.subscriptionId}`);

      // Validate client state
      if (!subscriptionService.validateClientState(notification.clientState)) {
        context.error(`Invalid client state for subscription ${notification.subscriptionId}`);
        context.error('Possible security issue - notification rejected');
        continue;
      }

      context.log(`Client state validated for subscription: ${notification.subscriptionId}`);

      // Check if delta processing is enabled
      if (!config.processDeltaEnabled) {
        context.warn('Delta processing is disabled (PROCESS_DELTA_ENABLED=false)');
        context.warn('Notification will be ignored. Run startRoutine to enable delta processing.');
        continue;
      }

      // Queue delta processing
      // Note: In a real implementation, this would queue a message to Azure Storage Queue
      // For now, we'll log that the notification was received
      context.log(`Delta processing would be queued for subscription: ${notification.subscriptionId}`);
      context.log(`Resource: ${notification.resource}`);
      context.log(`Change type: ${notification.changeType}`);

      // TODO: Implement actual queue message sending
      // Example:
      // await queueClient.sendMessage({
      //   subscriptionId: notification.subscriptionId,
      //   resource: notification.resource,
      //   changeType: notification.changeType,
      // });
    }

    // Return 200 OK immediately (async processing)
    context.log('Webhook notification processed successfully');
    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Notification received and queued for processing',
      },
    };
  } catch (error: any) {
    context.error('=== onOneDriveWebhookNotification: Error processing notification ===');
    context.error(`Error: ${error.message}`);
    context.error(`Stack: ${error.stack}`);

    // Return 500 to indicate processing failure
    // Microsoft Graph may retry the notification
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error.message || 'Unknown error processing notification',
      },
    };
  }
}

/**
 * Webhook notification payload from Microsoft Graph
 */
interface WebhookNotificationPayload {
  value: Array<{
    subscriptionId: string;
    clientState: string;
    resource: string;
    changeType: string;
    subscriptionExpirationDateTime: string;
    resourceData?: {
      id: string;
      '@odata.type': string;
      '@odata.id': string;
    };
  }>;
}

// Register the function
app.http('onOneDriveWebhookNotification', {
  methods: ['POST'],
  authLevel: 'anonymous', // Webhook notifications don't use function key auth
  handler: onOneDriveWebhookNotification,
});

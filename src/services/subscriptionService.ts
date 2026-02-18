/**
 * Webhook Subscription Service
 * Manages webhook subscriptions for OneDrive change notifications
 */

import { GraphClientService, WebhookSubscription } from './graphClient';
import webhookSubscriptionRepository from './webhookSubscriptionRepository';
import { getConfig } from '../config';

/**
 * Calculate expiration date/time for a webhook subscription
 * Microsoft Graph allows maximum 4230 minutes (approximately 3 days) for OneDrive subscriptions
 * @param offsetMinutes Minutes from now (default: 4200 minutes = ~70 hours)
 * @returns ISO 8601 date/time string
 */
function calculateExpirationDateTime(offsetMinutes: number = 4200): string {
  const now = new Date();
  const expiration = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return expiration.toISOString();
}

/**
 * Webhook Subscription Service
 * Manages the lifecycle of webhook subscriptions
 */
export class SubscriptionService {
  private graphClient: GraphClientService;
  private config: ReturnType<typeof getConfig>;

  constructor(graphClient: GraphClientService) {
    this.graphClient = graphClient;
    this.config = getConfig();
  }

  /**
   * Ensure a webhook subscription exists and is active
   * Creates a new subscription if none exists, or renews an existing one if it's close to expiring
   * @param notificationUrl URL to receive webhook notifications
   * @param driveId Drive ID to monitor (optional, uses user's drive if not provided)
   * @returns Active webhook subscription
   */
  async ensureSubscription(notificationUrl: string, driveId?: string): Promise<WebhookSubscription> {
    // Get drive ID if not provided
    const targetDriveId = driveId || await this.graphClient.getUserDriveId();
    const resource = `/drives/${targetDriveId}/root`;

    // Check if we have an existing subscription in our database
    const existingSubscriptions = await webhookSubscriptionRepository.findByResource(resource);

    if (existingSubscriptions.length > 0) {
      // Check if the subscription still exists in Microsoft Graph
      const dbSubscription = existingSubscriptions[0];
      const graphSubscription = await this.graphClient.getSubscription(dbSubscription.subscriptionId);

      if (graphSubscription) {
        // Subscription exists, check if it needs renewal (within 24 hours of expiration)
        const expirationTime = new Date(graphSubscription.expirationDateTime).getTime();
        const now = Date.now();
        const hoursUntilExpiration = (expirationTime - now) / (1000 * 60 * 60);

        if (hoursUntilExpiration > 24) {
          // Subscription is still valid, no renewal needed
          return graphSubscription;
        }

        // Renew the subscription
        const newExpiration = calculateExpirationDateTime();
        const renewedSubscription = await this.graphClient.updateSubscription(
          graphSubscription.id,
          newExpiration
        );

        // Update in database
        await webhookSubscriptionRepository.updateExpiration(
          dbSubscription.id,
          new Date(renewedSubscription.expirationDateTime)
        );

        return renewedSubscription;
      }

      // Subscription doesn't exist in Graph (may have been deleted), remove from our database
      await webhookSubscriptionRepository.delete(dbSubscription.id);
    }

    // Create a new subscription
    return await this.createSubscription(notificationUrl, resource);
  }

  /**
   * Create a new webhook subscription
   * @param notificationUrl URL to receive webhook notifications
   * @param resource Resource to monitor (e.g., /drives/{drive-id}/root)
   * @returns Created webhook subscription
   */
  async createSubscription(notificationUrl: string, resource: string): Promise<WebhookSubscription> {
    const expirationDateTime = calculateExpirationDateTime();

    const subscription = await this.graphClient.createSubscription({
      changeType: 'updated',
      notificationUrl,
      resource,
      expirationDateTime,
      clientState: this.config.webhookClientState,
    });

    // Store in database
    await webhookSubscriptionRepository.upsert({
      subscriptionId: subscription.id,
      resource: subscription.resource,
      clientState: subscription.clientState,
      expiration: new Date(subscription.expirationDateTime),
    });

    return subscription;
  }

  /**
   * Delete a webhook subscription
   * @param subscriptionId Subscription ID to delete
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    // Delete from Microsoft Graph
    await this.graphClient.deleteSubscription(subscriptionId);

    // Delete from database
    const dbSubscription = await webhookSubscriptionRepository.findBySubscriptionId(subscriptionId);
    if (dbSubscription) {
      await webhookSubscriptionRepository.delete(dbSubscription.id);
    }
  }

  /**
   * List all active subscriptions from Microsoft Graph
   * @returns Array of webhook subscriptions
   */
  async listSubscriptions(): Promise<WebhookSubscription[]> {
    return await this.graphClient.listSubscriptions();
  }

  /**
   * Check if a webhook notification is valid by verifying the client state
   * @param clientState Client state from the notification
   * @returns true if valid, false otherwise
   */
  validateClientState(clientState: string): boolean {
    return clientState === this.config.webhookClientState;
  }

  /**
   * Cleanup expired subscriptions from the database
   * Removes subscriptions that have expired and no longer exist in Microsoft Graph
   */
  async cleanupExpiredSubscriptions(): Promise<void> {
    const allSubscriptions = await webhookSubscriptionRepository.findAll();
    const now = new Date();

    for (const dbSubscription of allSubscriptions) {
      if (dbSubscription.expiration < now) {
        // Subscription has expired, check if it still exists in Graph
        const graphSubscription = await this.graphClient.getSubscription(dbSubscription.subscriptionId);
        
        if (!graphSubscription) {
          // Subscription doesn't exist in Graph, remove from database
          await webhookSubscriptionRepository.delete(dbSubscription.id);
        }
      }
    }
  }
}

/**
 * Create a SubscriptionService instance with a graph client
 * @param graphClient GraphClientService instance
 * @returns SubscriptionService instance
 */
export function createSubscriptionService(graphClient: GraphClientService): SubscriptionService {
  return new SubscriptionService(graphClient);
}

/**
 * Microsoft Graph Client Service
 * Handles authentication and API calls to Microsoft Graph using delegated permissions
 */

import { Client, PageCollection, PageIterator } from '@microsoft/microsoft-graph-client';
import { getConfig } from '../config';
import { validateToken } from '../utils/tokenValidator';

/**
 * Delta query result from Microsoft Graph
 */
export interface DeltaQueryResult {
  items: any[];
  deltaLink?: string;
  nextLink?: string;
}

/**
 * Webhook subscription configuration
 */
export interface WebhookSubscriptionConfig {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
}

/**
 * Webhook subscription response from Microsoft Graph
 */
export interface WebhookSubscription {
  id: string;
  resource: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

/**
 * Microsoft Graph Client Service
 * Provides methods for interacting with Microsoft Graph API using delegated permissions
 */
export class GraphClientService {
  private client: Client;
  private accessToken: string;

  /**
   * Create a new GraphClientService instance
   * @param accessToken Optional access token. If not provided, uses token from config
   */
  constructor(accessToken?: string) {
    const config = getConfig();
    this.accessToken = accessToken || config.graphAccessToken;
    
    // Initialize Graph client with delegated auth
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken);
      },
    });
  }

  /**
   * Validate the current access token
   * @returns TokenValidationResult indicating if the token is valid
   */
  async validateToken() {
    return await validateToken(this.accessToken);
  }

  /**
   * Get the user's OneDrive drive ID
   * @returns Drive ID string
   */
  async getUserDriveId(): Promise<string> {
    try {
      const drive = await this.client.api('/me/drive').get();
      return drive.id;
    } catch (error: any) {
      throw new Error(`Failed to get user drive ID: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Perform a delta query on the user's OneDrive root
   * @param deltaLink Optional delta link from previous query. If not provided, starts initial sync
   * @returns DeltaQueryResult with items and next/delta links
   */
  async queryDelta(deltaLink?: string): Promise<DeltaQueryResult> {
    try {
      const url = deltaLink || '/me/drive/root/delta';
      const response = await this.client.api(url).get();
      
      return {
        items: response.value || [],
        deltaLink: response['@odata.deltaLink'],
        nextLink: response['@odata.nextLink'],
      };
    } catch (error: any) {
      throw new Error(`Failed to query delta: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Perform a complete delta query with pagination
   * Automatically follows @odata.nextLink until all pages are retrieved
   * @param deltaLink Optional delta link from previous query
   * @returns DeltaQueryResult with all items and final delta link
   */
  async queryDeltaComplete(deltaLink?: string): Promise<DeltaQueryResult> {
    const allItems: any[] = [];
    let currentLink = deltaLink;
    let finalDeltaLink: string | undefined;

    while (true) {
      const result = await this.queryDelta(currentLink);
      allItems.push(...result.items);

      if (result.nextLink) {
        // More pages available, continue pagination
        currentLink = result.nextLink;
      } else if (result.deltaLink) {
        // Final page reached, save delta link for next sync
        finalDeltaLink = result.deltaLink;
        break;
      } else {
        // No more pages and no delta link (shouldn't happen, but handle gracefully)
        break;
      }
    }

    return {
      items: allItems,
      deltaLink: finalDeltaLink,
    };
  }

  /**
   * Create a webhook subscription for OneDrive changes
   * @param config Webhook subscription configuration
   * @returns Created webhook subscription
   */
  async createSubscription(config: WebhookSubscriptionConfig): Promise<WebhookSubscription> {
    try {
      const subscription = await this.client.api('/subscriptions').post(config);
      return subscription as WebhookSubscription;
    } catch (error: any) {
      throw new Error(`Failed to create subscription: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update an existing webhook subscription's expiration time
   * @param subscriptionId Subscription ID to update
   * @param expirationDateTime New expiration date/time
   * @returns Updated webhook subscription
   */
  async updateSubscription(
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<WebhookSubscription> {
    try {
      const subscription = await this.client
        .api(`/subscriptions/${subscriptionId}`)
        .patch({ expirationDateTime });
      return subscription as WebhookSubscription;
    } catch (error: any) {
      throw new Error(`Failed to update subscription: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get an existing webhook subscription by ID
   * @param subscriptionId Subscription ID to retrieve
   * @returns Webhook subscription or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<WebhookSubscription | null> {
    try {
      const subscription = await this.client.api(`/subscriptions/${subscriptionId}`).get();
      return subscription as WebhookSubscription;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw new Error(`Failed to get subscription: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * List all webhook subscriptions
   * @returns Array of webhook subscriptions
   */
  async listSubscriptions(): Promise<WebhookSubscription[]> {
    try {
      const response = await this.client.api('/subscriptions').get();
      return (response.value || []) as WebhookSubscription[];
    } catch (error: any) {
      throw new Error(`Failed to list subscriptions: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a webhook subscription
   * @param subscriptionId Subscription ID to delete
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.client.api(`/subscriptions/${subscriptionId}`).delete();
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Subscription already deleted, ignore
        return;
      }
      throw new Error(`Failed to delete subscription: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a drive item by ID
   * @param itemId Item ID to retrieve
   * @returns Drive item
   */
  async getDriveItem(itemId: string): Promise<any> {
    try {
      return await this.client.api(`/me/drive/items/${itemId}`).get();
    } catch (error: any) {
      throw new Error(`Failed to get drive item: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Create a GraphClientService instance with the configured access token
 * @returns GraphClientService instance
 */
export function createGraphClient(): GraphClientService {
  return new GraphClientService();
}

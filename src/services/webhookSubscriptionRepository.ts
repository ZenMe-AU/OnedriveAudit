/**
 * WebhookSubscriptionRepository
 * 
 * Repository for managing WebhookSubscription entities using Prisma ORM.
 * Tracks active webhook subscriptions from Microsoft Graph.
 */

import { WebhookSubscription } from '../generated/prisma';
import prisma from '../utils/prisma';

export class WebhookSubscriptionRepository {
  /**
   * Save a new webhook subscription
   */
  async save(data: {
    subscriptionId: string;
    resource: string;
    clientState: string;
    expiration: Date;
  }): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.upsert({
      where: { subscriptionId: data.subscriptionId },
      update: {
        resource: data.resource,
        clientState: data.clientState,
        expiration: data.expiration,
      },
      create: data,
    });
  }

  /**
   * Find a subscription by its ID
   */
  async findBySubscriptionId(subscriptionId: string): Promise<WebhookSubscription | null> {
    return prisma.webhookSubscription.findUnique({
      where: { subscriptionId },
    });
  }

  /**
   * Find subscriptions expiring soon (within the next N hours)
   */
  async findExpiring(hoursFromNow: number = 24): Promise<WebhookSubscription[]> {
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() + hoursFromNow);

    return prisma.webhookSubscription.findMany({
      where: {
        expiration: {
          lte: expirationThreshold,
        },
      },
      orderBy: {
        expiration: 'asc',
      },
    });
  }

  /**
   * Get all active subscriptions
   */
  async findAll(): Promise<WebhookSubscription[]> {
    return prisma.webhookSubscription.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update subscription expiration
   */
  async updateExpiration(subscriptionId: string, expiration: Date): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.update({
      where: { subscriptionId },
      data: { expiration },
    });
  }

  /**
   * Delete a subscription
   */
  async delete(id: number): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.delete({
      where: { id },
    });
  }

  /**
   * Delete a subscription by subscription ID
   */
  async deleteBySubscriptionId(subscriptionId: string): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.delete({
      where: { subscriptionId },
    });
  }

  /**
   * Delete expired subscriptions
   */
  async deleteExpired(): Promise<number> {
    const result = await prisma.webhookSubscription.deleteMany({
      where: {
        expiration: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Update subscription expiration by database ID
   */
  async updateExpirationById(id: number, expiration: Date): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.update({
      where: { id },
      data: { expiration },
    });
  }

  /**
   * Find subscriptions by resource
   */
  async findByResource(resource: string): Promise<WebhookSubscription[]> {
    return prisma.webhookSubscription.findMany({
      where: { resource },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Upsert a subscription
   */
  async upsert(data: {
    subscriptionId: string;
    resource: string;
    clientState: string;
    expiration: Date;
  }): Promise<WebhookSubscription> {
    return prisma.webhookSubscription.upsert({
      where: { subscriptionId: data.subscriptionId },
      update: {
        resource: data.resource,
        clientState: data.clientState,
        expiration: data.expiration,
      },
      create: data,
    });
  }
}

export default new WebhookSubscriptionRepository();

/**
 * ChangeEventRepository
 * 
 * Repository for managing ChangeEvent entities using Prisma ORM.
 * Provides operations for tracking and querying change history.
 */

import { ChangeEvent, EventType } from '../generated/prisma';
import prisma from '../utils/prisma';

export class ChangeEventRepository {
  /**
   * Insert a new change event
   */
  async insert(data: {
    driveItemId: number;
    eventType: EventType;
    oldName?: string | null;
    newName?: string | null;
    oldParentId?: number | null;
    newParentId?: number | null;
  }): Promise<ChangeEvent> {
    return prisma.changeEvent.create({
      data: {
        driveItemId: data.driveItemId,
        eventType: data.eventType,
        oldName: data.oldName,
        newName: data.newName,
        oldParentId: data.oldParentId,
        newParentId: data.newParentId,
      },
    });
  }

  /**
   * Find all change events for a specific drive item
   */
  async findByItem(driveItemId: number): Promise<ChangeEvent[]> {
    return prisma.changeEvent.findMany({
      where: { driveItemId },
      orderBy: { timestamp: 'desc' },
      include: {
        driveItem: true,
      },
    });
  }

  /**
   * Find change events within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<ChangeEvent[]> {
    return prisma.changeEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      include: {
        driveItem: true,
      },
    });
  }

  /**
   * Find change events by event type
   */
  async findByEventType(eventType: EventType): Promise<ChangeEvent[]> {
    return prisma.changeEvent.findMany({
      where: { eventType },
      orderBy: { timestamp: 'desc' },
      include: {
        driveItem: true,
      },
    });
  }

  /**
   * Get recent change events (last N events)
   */
  async getRecentEvents(limit: number = 100): Promise<ChangeEvent[]> {
    return prisma.changeEvent.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        driveItem: true,
      },
    });
  }

  /**
   * Get the full history of changes for a drive item
   */
  async getItemHistory(driveItemId: number): Promise<ChangeEvent[]> {
    return this.findByItem(driveItemId);
  }

  /**
   * Bulk insert change events
   */
  async bulkInsert(
    events: Array<{
      driveItemId: number;
      eventType: EventType;
      oldName?: string | null;
      newName?: string | null;
      oldParentId?: number | null;
      newParentId?: number | null;
    }>
  ): Promise<void> {
    await prisma.changeEvent.createMany({
      data: events,
    });
  }
}

export default new ChangeEventRepository();

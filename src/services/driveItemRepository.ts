/**
 * DriveItemRepository
 * 
 * Repository for managing DriveItem entities using Prisma ORM.
 * Provides CRUD operations and specialized queries for drive items.
 */

import { DriveItem, ItemType } from '../generated/prisma';
import prisma from '../utils/prisma';

export class DriveItemRepository {
  /**
   * Create or update a drive item (upsert operation)
   */
  async upsert(data: {
    itemId: string;
    driveId: string;
    name: string;
    itemType: ItemType;
    path: string;
    parentId?: number | null;
  }): Promise<DriveItem> {
    return prisma.driveItem.upsert({
      where: { itemId: data.itemId },
      update: {
        name: data.name,
        itemType: data.itemType,
        path: data.path,
        parentId: data.parentId,
        modifiedAt: new Date(),
      },
      create: {
        itemId: data.itemId,
        driveId: data.driveId,
        name: data.name,
        itemType: data.itemType,
        path: data.path,
        parentId: data.parentId,
      },
    });
  }

  /**
   * Find a drive item by its Graph API item ID
   */
  async findByItemId(itemId: string): Promise<DriveItem | null> {
    return prisma.driveItem.findUnique({
      where: { itemId },
    });
  }

  /**
   * Find a drive item by its database ID
   */
  async findById(id: number): Promise<DriveItem | null> {
    return prisma.driveItem.findUnique({
      where: { id },
    });
  }

  /**
   * Mark a drive item as deleted (soft delete)
   */
  async markDeleted(itemId: string): Promise<DriveItem> {
    return prisma.driveItem.update({
      where: { itemId },
      data: { isDeleted: true, modifiedAt: new Date() },
    });
  }

  /**
   * Get all children of a drive item
   */
  async getChildren(parentId: number): Promise<DriveItem[]> {
    return prisma.driveItem.findMany({
      where: {
        parentId,
        isDeleted: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get all active (non-deleted) items in a drive
   */
  async findByDriveId(driveId: string): Promise<DriveItem[]> {
    return prisma.driveItem.findMany({
      where: {
        driveId,
        isDeleted: false,
      },
      orderBy: {
        path: 'asc',
      },
    });
  }

  /**
   * Get the full hierarchy path for an item
   */
  async getItemHierarchy(itemId: string): Promise<DriveItem[]> {
    const item = await this.findByItemId(itemId);
    if (!item) return [];

    const hierarchy: DriveItem[] = [item];
    let currentItem = item;

    while (currentItem.parentId !== null) {
      const parent = await this.findById(currentItem.parentId);
      if (!parent) break;
      hierarchy.unshift(parent);
      currentItem = parent;
    }

    return hierarchy;
  }

  /**
   * Delete a drive item permanently (hard delete)
   * Use with caution - this removes the item from the database
   */
  async delete(itemId: string): Promise<DriveItem> {
    return prisma.driveItem.delete({
      where: { itemId },
    });
  }

  /**
   * Bulk upsert drive items
   */
  async bulkUpsert(items: Array<{
    itemId: string;
    driveId: string;
    name: string;
    itemType: ItemType;
    path: string;
    parentId?: number | null;
  }>): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.driveItem.upsert({
          where: { itemId: item.itemId },
          update: {
            name: item.name,
            itemType: item.itemType,
            path: item.path,
            parentId: item.parentId,
            modifiedAt: new Date(),
          },
          create: {
            itemId: item.itemId,
            driveId: item.driveId,
            name: item.name,
            itemType: item.itemType,
            path: item.path,
            parentId: item.parentId,
          },
        })
      )
    );
  }
}

export default new DriveItemRepository();

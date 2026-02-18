/**
 * Delta Processor Service
 * Processes delta changes from Microsoft Graph and updates the database
 */

import { GraphClientService } from './graphClient';
import driveItemRepository from './driveItemRepository';
import changeEventRepository from './changeEventRepository';
import deltaStateRepository from './deltaStateRepository';
import { ItemType, EventType } from '../generated/prisma';

/**
 * Delta item from Microsoft Graph
 */
export interface DeltaItem {
  id: string;
  name: string;
  parentReference?: {
    id?: string;
    driveId?: string;
  };
  file?: any;
  folder?: any;
  deleted?: {
    state: string;
  };
  lastModifiedDateTime?: string;
}

/**
 * Change detection result
 */
export interface DetectedChange {
  itemId: string;
  eventType: EventType;
  oldName?: string;
  newName?: string;
  oldParentId?: number;
  newParentId?: number;
}

/**
 * Delta processing result
 */
export interface DeltaProcessingResult {
  itemsProcessed: number;
  changesDetected: number;
  deltaToken: string;
}

/**
 * Delta Processor Service
 * Handles the processing of delta changes from Microsoft Graph
 */
export class DeltaProcessorService {
  private graphClient: GraphClientService;

  constructor(graphClient: GraphClientService) {
    this.graphClient = graphClient;
  }

  /**
   * Process delta changes for a drive
   * @param driveId Drive ID to process changes for
   * @returns DeltaProcessingResult with statistics
   */
  async processDelta(driveId: string): Promise<DeltaProcessingResult> {
    // Get the current delta token (if any)
    const deltaState = await deltaStateRepository.findByDriveId(driveId);
    const deltaLink = deltaState?.deltaToken;

    // Query Microsoft Graph for delta changes
    const deltaResult = await this.graphClient.queryDeltaComplete(deltaLink);

    // Process each item in the delta
    let changesDetected = 0;
    for (const item of deltaResult.items) {
      const change = await this.processDeltaItem(item as DeltaItem, driveId);
      if (change) {
        changesDetected++;
      }
    }

    // Update delta token
    if (deltaResult.deltaLink) {
      await deltaStateRepository.updateDeltaToken(driveId, deltaResult.deltaLink);
    }

    return {
      itemsProcessed: deltaResult.items.length,
      changesDetected,
      deltaToken: deltaResult.deltaLink || '',
    };
  }

  /**
   * Process a single delta item
   * Detects the type of change and updates the database accordingly
   * @param item Delta item from Microsoft Graph
   * @param driveId Drive ID
   * @returns DetectedChange if a change was detected, null otherwise
   */
  private async processDeltaItem(item: DeltaItem, driveId: string): Promise<DetectedChange | null> {
    // Get existing item from database (if any)
    const existingItem = await driveItemRepository.findByItemId(item.id);

    // Handle deleted items
    if (item.deleted) {
      if (existingItem) {
        // Mark as deleted
        await driveItemRepository.markAsDeleted(existingItem.id);

        // Log delete event
        await changeEventRepository.insert({
          driveItemId: existingItem.id,
          eventType: EventType.DELETE,
          oldName: existingItem.name,
        });

        return {
          itemId: item.id,
          eventType: EventType.DELETE,
          oldName: existingItem.name,
        };
      }
      // Item was already deleted or never existed, no change to log
      return null;
    }

    // Determine item type
    const itemType = item.folder ? ItemType.FOLDER : ItemType.FILE;

    // Build path (simplified - in real implementation would traverse parent hierarchy)
    const path = this.buildPath(item);

    // Get parent ID from database if it exists
    let parentId: number | undefined;
    if (item.parentReference?.id) {
      const parentItem = await driveItemRepository.findByItemId(item.parentReference.id);
      parentId = parentItem?.id;
    }

    if (!existingItem) {
      // New item - CREATE event
      const newItem = await driveItemRepository.upsert({
        itemId: item.id,
        driveId,
        name: item.name,
        itemType,
        path,
        parentId,
      });

      await changeEventRepository.insert({
        driveItemId: newItem.id,
        eventType: EventType.CREATE,
        newName: item.name,
        newParentId: parentId,
      });

      return {
        itemId: item.id,
        eventType: EventType.CREATE,
        newName: item.name,
      };
    }

    // Item exists - detect change type
    const change = this.detectChangeType(existingItem, item, parentId);

    if (change) {
      // Update the item
      await driveItemRepository.upsert({
        itemId: item.id,
        driveId,
        name: item.name,
        itemType,
        path,
        parentId,
      });

      // Log the change event
      await changeEventRepository.insert({
        driveItemId: existingItem.id,
        eventType: change.eventType,
        oldName: change.oldName,
        newName: change.newName,
        oldParentId: change.oldParentId,
        newParentId: change.newParentId,
      });

      return change;
    }

    // No significant change detected (may be metadata update only)
    return null;
  }

  /**
   * Detect the type of change between existing and new item
   * @param existingItem Existing item from database
   * @param newItem New item from delta
   * @param newParentId New parent ID (from database)
   * @returns DetectedChange or null if no significant change
   */
  private detectChangeType(
    existingItem: any,
    newItem: DeltaItem,
    newParentId?: number
  ): DetectedChange | null {
    const nameChanged = existingItem.name !== newItem.name;
    const parentChanged = existingItem.parentId !== newParentId;

    if (nameChanged && parentChanged) {
      // Both name and parent changed - log as MOVE (parent takes precedence)
      return {
        itemId: newItem.id,
        eventType: EventType.MOVE,
        oldName: existingItem.name,
        newName: newItem.name,
        oldParentId: existingItem.parentId,
        newParentId: newParentId,
      };
    }

    if (nameChanged) {
      // Only name changed - RENAME
      return {
        itemId: newItem.id,
        eventType: EventType.RENAME,
        oldName: existingItem.name,
        newName: newItem.name,
      };
    }

    if (parentChanged) {
      // Only parent changed - MOVE
      return {
        itemId: newItem.id,
        eventType: EventType.MOVE,
        oldParentId: existingItem.parentId,
        newParentId: newParentId,
      };
    }

    // No significant change (metadata update only)
    return null;
  }

  /**
   * Build path for an item
   * Simplified implementation - in production, would traverse parent hierarchy
   * @param item Delta item
   * @returns Path string
   */
  private buildPath(item: DeltaItem): string {
    // Simplified implementation
    // In production, would query parent items to build full path
    return `/${item.name}`;
  }

  /**
   * Perform initial delta sync for a drive
   * This is a full sync that processes all items
   * @param driveId Drive ID to sync
   * @returns DeltaProcessingResult with statistics
   */
  async performInitialSync(driveId: string): Promise<DeltaProcessingResult> {
    // Clear any existing delta token to force a full sync
    await deltaStateRepository.clearDeltaToken(driveId);

    // Process delta (which will be a full sync since we cleared the token)
    return await this.processDelta(driveId);
  }
}

/**
 * Create a DeltaProcessorService instance
 * @param graphClient GraphClientService instance
 * @returns DeltaProcessorService instance
 */
export function createDeltaProcessor(graphClient: GraphClientService): DeltaProcessorService {
  return new DeltaProcessorService(graphClient);
}

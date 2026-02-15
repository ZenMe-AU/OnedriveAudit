/**
 * Example: Using Prisma in Azure Functions
 * 
 * This file demonstrates how to use Prisma ORM and repositories
 * in Azure Functions for the OnedriveAudit application.
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import driveItemRepository from '../services/driveItemRepository';
import changeEventRepository from '../services/changeEventRepository';
import deltaStateRepository from '../services/deltaStateRepository';
import { ItemType, EventType } from '../generated/prisma';

/**
 * Example Azure Function: Process a file creation event
 * 
 * This function demonstrates:
 * - Creating/updating a DriveItem
 * - Logging a ChangeEvent
 * - Using Prisma transactions
 */
export async function exampleProcessFileCreation(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as {
      itemId: string;
      driveId: string;
      name: string;
      path: string;
      parentId?: number;
    };

    context.log('Processing file creation:', body.name);

    // 1. Upsert the drive item
    const driveItem = await driveItemRepository.upsert({
      itemId: body.itemId,
      driveId: body.driveId,
      name: body.name,
      itemType: ItemType.FILE,
      path: body.path,
      parentId: body.parentId,
    });

    context.log('Drive item created/updated:', driveItem.id);

    // 2. Log the change event
    const changeEvent = await changeEventRepository.insert({
      driveItemId: driveItem.id,
      eventType: EventType.CREATE,
      newName: body.name,
    });

    context.log('Change event logged:', changeEvent.id);

    return {
      status: 200,
      jsonBody: {
        success: true,
        driveItem,
        changeEvent,
      },
    };
  } catch (error) {
    context.error('Error processing file creation:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Example Azure Function: Get file history
 * 
 * This function demonstrates:
 * - Retrieving a DriveItem
 * - Getting change history
 * - Error handling
 */
export async function exampleGetFileHistory(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const itemId = request.query.get('itemId');
    
    if (!itemId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'itemId query parameter is required',
        },
      };
    }

    context.log('Retrieving file history for:', itemId);

    // 1. Get the drive item
    const driveItem = await driveItemRepository.findByItemId(itemId);

    if (!driveItem) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Drive item not found',
        },
      };
    }

    // 2. Get the change history
    const history = await changeEventRepository.findByItem(driveItem.id);

    context.log(`Found ${history.length} change events`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        driveItem,
        history,
      },
    };
  } catch (error) {
    context.error('Error retrieving file history:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Example Azure Function: Update delta token
 * 
 * This function demonstrates:
 * - Updating delta state
 * - Upserting records
 */
export async function exampleUpdateDeltaToken(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as {
      driveId: string;
      deltaToken: string;
    };

    context.log('Updating delta token for drive:', body.driveId);

    // Update the delta token (upserts automatically)
    const deltaState = await deltaStateRepository.updateDeltaToken(
      body.driveId,
      body.deltaToken
    );

    context.log('Delta token updated:', deltaState.id);

    return {
      status: 200,
      jsonBody: {
        success: true,
        deltaState,
      },
    };
  } catch (error) {
    context.error('Error updating delta token:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Example Azure Function: Bulk operation with transaction
 * 
 * This function demonstrates:
 * - Using Prisma transactions
 * - Bulk operations
 * - Error rollback
 */
export async function exampleBulkFileOperation(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as {
      driveId: string;
      files: Array<{
        itemId: string;
        name: string;
        path: string;
      }>;
    };

    context.log(`Processing bulk operation for ${body.files.length} files`);

    // Use bulk upsert method
    await driveItemRepository.bulkUpsert(
      body.files.map(file => ({
        itemId: file.itemId,
        driveId: body.driveId,
        name: file.name,
        itemType: ItemType.FILE,
        path: file.path,
      }))
    );

    context.log('Bulk operation completed successfully');

    return {
      status: 200,
      jsonBody: {
        success: true,
        count: body.files.length,
      },
    };
  } catch (error) {
    context.error('Error in bulk operation:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// Register the example functions (commented out - for reference only)
// app.http('exampleProcessFileCreation', {
//   methods: ['POST'],
//   authLevel: 'function',
//   handler: exampleProcessFileCreation,
// });

// app.http('exampleGetFileHistory', {
//   methods: ['GET'],
//   authLevel: 'function',
//   handler: exampleGetFileHistory,
// });

// app.http('exampleUpdateDeltaToken', {
//   methods: ['POST'],
//   authLevel: 'function',
//   handler: exampleUpdateDeltaToken,
// });

// app.http('exampleBulkFileOperation', {
//   methods: ['POST'],
//   authLevel: 'function',
//   handler: exampleBulkFileOperation,
// });

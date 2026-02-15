/**
 * DeltaStateRepository
 * 
 * Repository for managing DeltaState entities using Prisma ORM.
 * Tracks synchronization state for each drive.
 */

import { DeltaState } from '../generated/prisma';
import prisma from '../utils/prisma';

export class DeltaStateRepository {
  /**
   * Get the delta token for a drive
   */
  async getDeltaToken(driveId: string): Promise<string | null> {
    const state = await prisma.deltaState.findUnique({
      where: { driveId },
    });
    return state?.deltaToken ?? null;
  }

  /**
   * Update the delta token for a drive
   */
  async updateDeltaToken(driveId: string, deltaToken: string): Promise<DeltaState> {
    return prisma.deltaState.upsert({
      where: { driveId },
      update: {
        deltaToken,
        lastSync: new Date(),
        updatedAt: new Date(),
      },
      create: {
        driveId,
        deltaToken,
        lastSync: new Date(),
      },
    });
  }

  /**
   * Get the last sync timestamp for a drive
   */
  async getLastSync(driveId: string): Promise<Date | null> {
    const state = await prisma.deltaState.findUnique({
      where: { driveId },
    });
    return state?.lastSync ?? null;
  }

  /**
   * Get the full delta state for a drive
   */
  async getState(driveId: string): Promise<DeltaState | null> {
    return prisma.deltaState.findUnique({
      where: { driveId },
    });
  }

  /**
   * Get all delta states (all drives being tracked)
   */
  async getAllStates(): Promise<DeltaState[]> {
    return prisma.deltaState.findMany({
      orderBy: { lastSync: 'desc' },
    });
  }

  /**
   * Delete delta state for a drive
   */
  async deleteState(driveId: string): Promise<DeltaState> {
    return prisma.deltaState.delete({
      where: { driveId },
    });
  }

  /**
   * Clear the delta token for a drive (forces full sync on next query)
   */
  async clearDeltaToken(driveId: string): Promise<void> {
    const state = await prisma.deltaState.findUnique({
      where: { driveId },
    });
    
    if (state) {
      await prisma.deltaState.update({
        where: { driveId },
        data: {
          deltaToken: '',
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Find delta state by drive ID
   */
  async findByDriveId(driveId: string): Promise<DeltaState | null> {
    return prisma.deltaState.findUnique({
      where: { driveId },
    });
  }
}

export default new DeltaStateRepository();

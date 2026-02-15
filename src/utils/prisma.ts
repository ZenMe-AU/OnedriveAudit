/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton instance of the Prisma Client
 * to be used across the application. It ensures only one instance
 * is created and reused throughout the app lifecycle.
 */

import { PrismaClient } from '../generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Disconnect from the database
 * Call this when shutting down the application
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};

export default prisma;

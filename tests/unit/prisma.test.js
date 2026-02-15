"use strict";
/**
 * Prisma Client Tests
 *
 * Basic tests to verify Prisma client is properly configured
 * and can be imported without errors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../src/generated/prisma");
describe('Prisma Client', () => {
    it('should export PrismaClient class', () => {
        expect(prisma_1.PrismaClient).toBeDefined();
        expect(typeof prisma_1.PrismaClient).toBe('function');
    });
    it('should be able to import types from generated client', () => {
        // Import test - if this test runs without error, imports are working
        const { ItemType, EventType } = require('../../src/generated/prisma');
        expect(ItemType).toBeDefined();
        expect(EventType).toBeDefined();
    });
    it('should have expected ItemType enum values', () => {
        const { ItemType } = require('../../src/generated/prisma');
        expect(ItemType.FILE).toBe('FILE');
        expect(ItemType.FOLDER).toBe('FOLDER');
    });
    it('should have expected EventType enum values', () => {
        const { EventType } = require('../../src/generated/prisma');
        expect(EventType.CREATE).toBe('CREATE');
        expect(EventType.RENAME).toBe('RENAME');
        expect(EventType.MOVE).toBe('MOVE');
        expect(EventType.DELETE).toBe('DELETE');
        expect(EventType.UPDATE).toBe('UPDATE');
    });
});
//# sourceMappingURL=prisma.test.js.map
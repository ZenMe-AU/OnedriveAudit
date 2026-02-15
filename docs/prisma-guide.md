# Prisma Database ORM - Developer Guide

This project uses [Prisma](https://www.prisma.io/) as the database ORM for type-safe database access and migrations.

## Setup

Prisma has been configured with PostgreSQL as the database provider. The schema is located at `prisma/schema.prisma`.

### Environment Variables

Create a `.env` file in the root directory (already gitignored) with your database connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/onedriveaudit?schema=public"
```

For Azure PostgreSQL, use:
```env
DATABASE_URL="postgresql://username:password@yourserver.postgres.database.azure.com:5432/onedriveaudit?schema=public&sslmode=require"
```

## Database Schema

The Prisma schema defines four main models:

### 1. DriveItem
Stores the current state of all files and folders.
- **Key fields**: `itemId` (unique), `driveId`, `name`, `itemType`, `path`, `parentId`, `isDeleted`
- **Indexes**: `parentId`, `(driveId, isDeleted)`

### 2. ChangeEvent
Audit log of all changes over time.
- **Key fields**: `eventType`, `oldName`, `newName`, `oldParentId`, `newParentId`, `timestamp`
- **Indexes**: `(driveItemId, timestamp)`, `timestamp`

### 3. DeltaState
Tracks synchronization state per drive.
- **Key fields**: `driveId` (unique), `deltaToken`, `lastSync`

### 4. WebhookSubscription
Manages active webhook subscriptions.
- **Key fields**: `subscriptionId` (unique), `resource`, `clientState`, `expiration`

## Available Scripts

### Generate Prisma Client
```bash
npm run prisma:generate
```
Generates TypeScript types and client from the schema. Run this after schema changes.

### Create a Migration
```bash
npm run prisma:migrate
```
Creates a new migration file and applies it to the database. Use this in development.

### Apply Migrations (Production)
```bash
npm run prisma:migrate:deploy
```
Applies pending migrations. Use this in CI/CD pipelines.

### Push Schema (Development)
```bash
npm run db:push
```
Pushes schema changes directly to the database without creating migration files. Useful for rapid prototyping.

### Open Prisma Studio
```bash
npm run prisma:studio
```
Opens a GUI to view and edit your database data.

### Format Schema
```bash
npm run prisma:format
```
Formats the Prisma schema file.

## Using Prisma in Code

### Import the Prisma Client

```typescript
import prisma from './utils/prisma';
```

### Using Repositories

The project includes pre-built repositories for each model:

```typescript
import driveItemRepository from './services/driveItemRepository';
import changeEventRepository from './services/changeEventRepository';
import deltaStateRepository from './services/deltaStateRepository';
import webhookSubscriptionRepository from './services/webhookSubscriptionRepository';

// Example: Upsert a drive item
const item = await driveItemRepository.upsert({
  itemId: 'abc123',
  driveId: 'drive456',
  name: 'Document.docx',
  itemType: 'FILE',
  path: '/Documents/Document.docx',
  parentId: null,
});

// Example: Log a change event
await changeEventRepository.insert({
  driveItemId: item.id,
  eventType: 'CREATE',
  newName: 'Document.docx',
});

// Example: Update delta token
await deltaStateRepository.updateDeltaToken('drive456', 'newToken123');
```

### Direct Prisma Client Usage

For operations not covered by repositories:

```typescript
import prisma from './utils/prisma';

// Find all files in a specific folder
const files = await prisma.driveItem.findMany({
  where: {
    parentId: 123,
    itemType: 'FILE',
    isDeleted: false,
  },
  orderBy: {
    name: 'asc',
  },
});

// Transaction example
await prisma.$transaction([
  prisma.driveItem.update({ where: { id: 1 }, data: { name: 'NewName' } }),
  prisma.changeEvent.create({ data: { /* ... */ } }),
]);
```

## Type Safety

Prisma provides full TypeScript type safety:

```typescript
import { DriveItem, ItemType, EventType } from './generated/prisma';

// Types are automatically generated from your schema
const item: DriveItem = await prisma.driveItem.findUnique({
  where: { id: 1 },
});

// Enums are type-safe
const itemType: ItemType = 'FILE'; // ✓ Valid
const itemType: ItemType = 'INVALID'; // ✗ TypeScript error
```

## Migrations

### Development Workflow

1. Modify the schema in `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create and apply the migration
3. Commit both the schema and migration files to git

### Production Deployment

Migrations are applied automatically via the `postinstall` script which runs `prisma generate`. For Azure Functions, you should run migrations as part of your deployment pipeline:

```bash
npm run prisma:migrate:deploy
```

## Best Practices

1. **Always use repositories** for common operations to maintain consistency
2. **Use transactions** when multiple operations must succeed or fail together
3. **Never commit `.env` files** - they are gitignored by default
4. **Run `prisma generate`** after pulling schema changes from git
5. **Test migrations** in a development database before applying to production
6. **Use soft deletes** (`isDeleted` flag) for audit trail purposes
7. **Index frequently queried fields** for better performance

## Troubleshooting

### Error: "Prisma Client could not find"
Run `npm run prisma:generate` to regenerate the client.

### Error: "DATABASE_URL is not defined"
Ensure your `.env` file exists and contains a valid `DATABASE_URL`.

### Connection Issues
- Verify database credentials
- Check firewall rules (Azure PostgreSQL requires IP whitelisting)
- Ensure SSL is enabled for Azure connections

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [PostgreSQL Connection Strings](https://www.prisma.io/docs/reference/database-reference/connection-urls#postgresql)

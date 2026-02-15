# OnedriveAudit - Function App Sequence Diagrams

**Version:** 1.0  
**Last Updated:** February 15, 2026  
**Status:** Initial Design

---

## Table of Contents

1. [Overview](#overview)
2. [startRoutine Sequence](#startroutine-sequence)
3. [onOneDriveWebhookNotification Sequence](#ononedrivewebhooknotification-sequence)
4. [processDeltaBatch Sequence](#processdeltabatch-sequence)
5. [Component Interactions](#component-interactions)
6. [Error Handling Flows](#error-handling-flows)

---

## Overview

This document provides detailed sequence diagrams for the three core Azure Functions in the OnedriveAudit system:

1. **startRoutine** - Initialization and webhook subscription setup
2. **onOneDriveWebhookNotification** - Webhook notification handler
3. **processDeltaBatch** - Delta change processing

Each diagram shows the complete flow of execution including:
- Component interactions
- Data transformations
- Database operations
- Error handling paths

### Notation

- **→** : Synchronous call
- **⇢** : Asynchronous operation
- **- ->** : Return value
- **[condition]** : Conditional flow
- **loop** : Iteration
- **alt** : Alternative path

---

## startRoutine Sequence

### Purpose

Initialize the system by setting up webhook subscription and performing initial delta synchronization.

### Trigger

- Manual invocation (HTTP GET/POST)
- Scheduled timer (maintenance)
- System startup

### Sequence Diagram

```
┌────────┐         ┌──────────────┐         ┌───────────────┐         ┌──────────┐         ┌────────────┐
│ Admin/ │         │ startRoutine │         │ GraphClient   │         │Microsoft │         │PostgreSQL  │
│Scheduler│         │  (Function)  │         │   Service     │         │  Graph   │         │  Database  │
└───┬────┘         └──────┬───────┘         └───────┬───────┘         └─────┬────┘         └──────┬─────┘
    │                     │                         │                       │                      │
    │ HTTP GET/POST       │                         │                       │                      │
    │────────────────────>│                         │                       │                      │
    │                     │                         │                       │                      │
    │                     │ 1. Authenticate         │                       │                      │
    │                     │────────────────────────>│                       │                      │
    │                     │                         │                       │                      │
    │                     │                         │ 2. Get Access Token   │                      │
    │                     │                         │──────────────────────>│                      │
    │                     │                         │                       │                      │
    │                     │                         │ Access Token          │                      │
    │                     │                         │<──────────────────────│                      │
    │                     │                         │                       │                      │
    │                     │ Authenticated Client    │                       │                      │
    │                     │<────────────────────────│                       │                      │
    │                     │                         │                       │                      │
    │                     │ 3. Get Existing         │                       │                      │
    │                     │    Subscriptions        │                       │                      │
    │                     │────────────────────────>│                       │                      │
    │                     │                         │                       │                      │
    │                     │                         │ 4. GET /subscriptions │                      │
    │                     │                         │──────────────────────>│                      │
    │                     │                         │                       │                      │
    │                     │                         │ Subscription List     │                      │
    │                     │                         │<──────────────────────│                      │
    │                     │                         │                       │                      │
    │                     │ Subscriptions           │                       │                      │
    │                     │<────────────────────────│                       │                      │
    │                     │                         │                       │                      │
    │    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │    │ alt [Subscription exists and not expired]                                              │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ 5. Update Expiration    │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 6. PATCH /subscriptions/{id}                 │
    │    │                 │                         │──────────────────────>│                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ Updated Subscription  │                      │
    │    │                 │                         │<──────────────────────│                      │
    │    │                 │                         │                       │                      │
    │    │                 │ Subscription            │                       │                      │
    │    │                 │<────────────────────────│                       │                      │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │ [else] Create new subscription                                                          │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ 7. Create Subscription  │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 8. POST /subscriptions│                      │
    │    │                 │                         │    {                  │                      │
    │    │                 │                         │      changeType: "updated",                  │
    │    │                 │                         │      resource: "/drives/{id}/root",          │
    │    │                 │                         │      notificationUrl,                       │
    │    │                 │                         │      clientState      │                      │
    │    │                 │                         │    }                  │                      │
    │    │                 │                         │──────────────────────>│                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 9. Validation Request │                      │
    │    │                 │                         │   (validationToken)   │                      │
    │    │                 │<──────────────────────────────────────────────────────────────────┐   │
    │    │                 │                         │                       │                  │   │
    │    │                 │ Return validationToken  │                       │                  │   │
    │    │                 │───────────────────────────────────────────────────────────────────>│   │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ Subscription Created  │                      │
    │    │                 │                         │<──────────────────────│                      │
    │    │                 │                         │                       │                      │
    │    │                 │ Subscription            │                       │                      │
    │    │                 │<────────────────────────│                       │                      │
    │    └────────────────────────────────────────────────────────────────────────────────────────┘
    │                     │                         │                       │                      │
    │                     │ 10. Save Subscription   │                       │                      │
    │                     │─────────────────────────────────────────────────────────────────────>│
    │                     │                         │                       │                      │
    │                     │                         │ INSERT INTO webhook_subscriptions            │
    │                     │                         │                       │                      │
    │                     │ Saved                   │                       │                      │
    │                     │<─────────────────────────────────────────────────────────────────────│
    │                     │                         │                       │                      │
    │                     │ 11. Get Delta Token     │                       │                      │
    │                     │─────────────────────────────────────────────────────────────────────>│
    │                     │                         │                       │                      │
    │                     │                         │ SELECT delta_token FROM delta_state          │
    │                     │                         │                       │                      │
    │                     │ Token (or null)         │                       │                      │
    │                     │<─────────────────────────────────────────────────────────────────────│
    │                     │                         │                       │                      │
    │    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │    │ alt [Token exists]                                                                      │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ 12. Delta Query         │                       │                      │
    │    │                 │    (incremental)        │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 13. GET {deltaLink}   │                      │
    │    │                 │                         │──────────────────────>│                      │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │ [else] Initial delta query                                                              │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ 14. Delta Query         │                       │                      │
    │    │                 │    (initial)            │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 15. GET /drives/{id}/root/delta              │
    │    │                 │                         │──────────────────────>│                      │
    │    └────────────────────────────────────────────────────────────────────────────────────────┘
    │                     │                         │                       │                      │
    │    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │    │ loop [For each page of results]                                                         │
    │    │────────────────────────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │                         │ Delta Response        │                      │
    │    │                 │                         │ {                     │                      │
    │    │                 │                         │   value: [items],     │                      │
    │    │                 │                         │   @odata.nextLink,    │                      │
    │    │                 │                         │   @odata.deltaLink    │                      │
    │    │                 │                         │ }                     │                      │
    │    │                 │                         │<──────────────────────│                      │
    │    │                 │                         │                       │                      │
    │    │                 │ Delta Items             │                       │                      │
    │    │                 │<────────────────────────│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │ 16. Process Items       │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │ [For each item]         │                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │ 17. Upsert DriveItem    │                       │                      │
    │    │                 │─────────────────────────────────────────────────────────────────────>│
    │    │                 │                         │                       │                      │
    │    │                 │                         │ INSERT ... ON CONFLICT UPDATE               │
    │    │                 │                         │                       │                      │
    │    │                 │ Success                 │                       │                      │
    │    │                 │<─────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ 18. Insert ChangeEvent  │                       │                      │
    │    │                 │─────────────────────────────────────────────────────────────────────>│
    │    │                 │                         │                       │                      │
    │    │                 │                         │ INSERT INTO change_events                    │
    │    │                 │                         │                       │                      │
    │    │                 │ Success                 │                       │                      │
    │    │                 │<─────────────────────────────────────────────────────────────────────│
    │    │                 │                         │                       │                      │
    │    │                 │ Items Processed         │                       │                      │
    │    │                 │<────────────────────────│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │ [If @odata.nextLink]    │                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │ 19. Get Next Page       │                       │                      │
    │    │                 │────────────────────────>│                       │                      │
    │    │                 │                         │                       │                      │
    │    │                 │                         │ 20. GET {nextLink}    │                      │
    │    │                 │                         │──────────────────────>│                      │
    │    └────────────────────────────────────────────────────────────────────────────────────────┘
    │                     │                         │                       │                      │
    │                     │ 21. Update Delta Token  │                       │                      │
    │                     │─────────────────────────────────────────────────────────────────────>│
    │                     │                         │                       │                      │
    │                     │                         │ INSERT/UPDATE delta_state                    │
    │                     │                         │                       │                      │
    │                     │ Success                 │                       │                      │
    │                     │<─────────────────────────────────────────────────────────────────────│
    │                     │                         │                       │                      │
    │ HTTP 200 OK         │                         │                       │                      │
    │ {                   │                         │                       │                      │
    │   message: "Initialized",                     │                       │                      │
    │   itemsProcessed: N │                         │                       │                      │
    │ }                   │                         │                       │                      │
    │<────────────────────│                         │                       │                      │
    │                     │                         │                       │                      │
```

### Key Steps

1. **Authentication (Steps 1-2)**
   - Use Azure Identity to get access token
   - Client credentials flow with app registration

2. **Subscription Management (Steps 3-10)**
   - Check for existing subscription
   - Renew if exists and approaching expiration
   - Create new if none exists or expired
   - Handle webhook validation during creation
   - Save subscription metadata to database

3. **Initial Delta Sync (Steps 11-20)**
   - Retrieve existing delta token (if any)
   - Perform delta query (initial or incremental)
   - Handle pagination for large result sets
   - Process each item: upsert drive_items, insert change_events
   - Extract new delta token from response

4. **State Persistence (Step 21)**
   - Save delta token for next incremental sync
   - Update last_sync timestamp

### Response

**Success (200 OK):**
```json
{
  "status": "success",
  "message": "System initialized successfully",
  "subscriptionId": "abc-123-def",
  "subscriptionExpiration": "2026-02-22T06:00:00Z",
  "itemsProcessed": 1542,
  "deltaToken": "abc123...",
  "lastSync": "2026-02-15T06:30:00Z"
}
```

**Error (500):**
```json
{
  "status": "error",
  "message": "Failed to initialize",
  "error": "Authentication failed: Invalid client credentials"
}
```

---

## onOneDriveWebhookNotification Sequence

### Purpose

Handle webhook notifications from Microsoft Graph when OneDrive changes occur.

### Trigger

- HTTP POST from Microsoft Graph
- Contains change notification or validation request

### Sequence Diagram

```
┌────────────┐         ┌────────────────────────┐         ┌──────────────┐         ┌────────────┐
│ Microsoft  │         │ onOneDriveWebhook      │         │   Queue      │         │ PostgreSQL │
│   Graph    │         │ Notification (Function)│         │   Service    │         │  Database  │
└─────┬──────┘         └────────────┬───────────┘         └──────┬───────┘         └──────┬─────┘
      │                             │                            │                        │
      │ POST /api/onWebhook         │                            │                        │
      │ Headers:                    │                            │                        │
      │   Content-Type: application/json                         │                        │
      │ Query:                      │                            │                        │
      │   ?validationToken={token}  │                            │                        │
      │────────────────────────────>│                            │                        │
      │                             │                            │                        │
      │    ┌────────────────────────────────────────────────────────────────────────────────┐
      │    │ alt [Validation Request]                                                        │
      │    │────────────────────────────────────────────────────────────────────────────────│
      │    │                         │                            │                        │
      │    │                         │ 1. Detect validationToken  │                        │
      │    │                         │    in query string         │                        │
      │    │                         │                            │                        │
      │    │                         │ 2. Return Token as plain/text                       │
      │    │                         │                            │                        │
      │    │ HTTP 200 OK             │                            │                        │
      │    │ Content-Type: text/plain│                            │                        │
      │    │ Body: {validationToken} │                            │                        │
      │    │<────────────────────────│                            │                        │
      │    │                         │                            │                        │
      │    │────────────────────────────────────────────────────────────────────────────────│
      │    │ [else] Change Notification                                                      │
      │    │────────────────────────────────────────────────────────────────────────────────│
      │    │                         │                            │                        │
      │    │                         │ 3. Parse Notification Body │                        │
      │    │                         │    {                       │                        │
      │    │                         │      value: [{             │                        │
      │    │                         │        subscriptionId,     │                        │
      │    │                         │        clientState,        │                        │
      │    │                         │        resource,           │                        │
      │    │                         │        changeType          │                        │
      │    │                         │      }]                    │                        │
      │    │                         │    }                       │                        │
      │    │                         │                            │                        │
      │    │                         │ 4. Validate clientState    │                        │
      │    │                         │────────────────────────────────────────────────────>│
      │    │                         │                            │                        │
      │    │                         │    SELECT client_state     │                        │
      │    │                         │    FROM webhook_subscriptions                      │
      │    │                         │    WHERE subscription_id = ?                       │
      │    │                         │                            │                        │
      │    │                         │ Stored clientState         │                        │
      │    │                         │<────────────────────────────────────────────────────│
      │    │                         │                            │                        │
      │    │                         │ 5. Compare clientState     │                        │
      │    │                         │    values                  │                        │
      │    │                         │                            │                        │
      │    │    ┌────────────────────────────────────────────────────────────────────────────┐
      │    │    │ alt [clientState valid]                                                     │
      │    │    │────────────────────────────────────────────────────────────────────────────│
      │    │    │                     │                            │                        │
      │    │    │                     │ 6. Create Queue Message    │                        │
      │    │    │                     │    {                       │                        │
      │    │    │                     │      subscriptionId,       │                        │
      │    │    │                     │      resource,             │                        │
      │    │    │                     │      changeType,           │                        │
      │    │    │                     │      timestamp             │                        │
      │    │    │                     │    }                       │                        │
      │    │    │                     │                            │                        │
      │    │    │                     │ 7. Enqueue Message         │                        │
      │    │    │                     │───────────────────────────>│                        │
      │    │    │                     │                            │                        │
      │    │    │                     │                      Queue: delta-processing        │
      │    │    │                     │                            │                        │
      │    │    │                     │ Message Queued             │                        │
      │    │    │                     │<───────────────────────────│                        │
      │    │    │                     │                            │                        │
      │    │    │                     │ 8. Log Success             │                        │
      │    │    │                     │                            │                        │
      │    │    │ HTTP 202 Accepted   │                            │                        │
      │    │    │<────────────────────│                            │                        │
      │    │    │────────────────────────────────────────────────────────────────────────────│
      │    │    │ [else] Invalid clientState                                                  │
      │    │    │────────────────────────────────────────────────────────────────────────────│
      │    │    │                     │                            │                        │
      │    │    │                     │ 9. Log Security Warning    │                        │
      │    │    │                     │                            │                        │
      │    │    │ HTTP 401 Unauthorized│                           │                        │
      │    │    │<────────────────────│                            │                        │
      │    │    └────────────────────────────────────────────────────────────────────────────┘
      │    └────────────────────────────────────────────────────────────────────────────────┘
      │                             │                            │                        │
                                    │                            │                        │
                                    │                      [Async Processing]              │
                                    │                            │                        │
                                    │                            │ processDeltaBatch      │
                                    │                            │ (see next diagram)     │
                                    │                            │                        │
```

### Key Steps

1. **Validation Request Handling (alt path 1)**
   - Microsoft Graph sends validation request with `validationToken` query param
   - Function extracts token and returns it as plain text
   - Required during subscription creation and periodic revalidation

2. **Notification Processing (alt path 2)**
   - Parse notification body containing subscription details
   - Extract subscriptionId, clientState, resource, changeType
   - Validate clientState matches stored value for security
   - Enqueue message for asynchronous delta processing
   - Return 202 Accepted immediately (don't block webhook)

3. **Security Validation**
   - Compare received clientState with stored value in database
   - Reject request with 401 if validation fails
   - Log security warnings for investigation

### Request Examples

**Validation Request:**
```
POST /api/onWebhook?validationToken=abc123xyz
Content-Type: application/json
```

**Change Notification:**
```
POST /api/onWebhook
Content-Type: application/json

{
  "value": [
    {
      "subscriptionId": "7f105c7d-2dc5-4530-97cd-4e7ae6534c07",
      "subscriptionExpirationDateTime": "2026-02-22T18:23:45.9356913Z",
      "clientState": "secretClientValue",
      "changeType": "updated",
      "resource": "/drives/b!-RIj2DuyvEyV1T4NlOaMHk8XkS_I8MdFlUCq1BlcjgmhRfAj3-Z8RY2VpuvV_tpd",
      "resourceData": {
        "id": "01YWDX3NM3LS4O6YHZNFBLK4Q5GGQGBR7C"
      },
      "tenantId": "84bd8158-6d4d-4958-8b9f-9d6445542f95"
    }
  ]
}
```

### Response Examples

**Validation Response (200 OK):**
```
Content-Type: text/plain

abc123xyz
```

**Accepted Response (202 Accepted):**
```json
{
  "status": "accepted",
  "message": "Notification queued for processing"
}
```

**Unauthorized Response (401 Unauthorized):**
```json
{
  "status": "error",
  "message": "Invalid client state"
}
```

### Error Handling

- **Invalid JSON:** Return 400 Bad Request
- **Missing clientState:** Return 401 Unauthorized
- **Queue unavailable:** Return 503 Service Unavailable with retry header
- **Database error:** Log error, return 202 (don't block Microsoft Graph)

---

## processDeltaBatch Sequence

### Purpose

Process delta changes from Microsoft Graph and update database with new/modified/deleted items.

### Trigger

- Queue message from onOneDriveWebhookNotification
- Manual invocation for testing

### Sequence Diagram

```
┌──────────┐         ┌─────────────────┐         ┌─────────────┐         ┌──────────┐         ┌────────────┐
│  Queue   │         │ processDeltaBatch│        │DeltaProcessor│        │Microsoft │         │ PostgreSQL │
│ Service  │         │   (Function)     │        │   Service    │        │  Graph   │         │  Database  │
└────┬─────┘         └────────┬─────────┘        └──────┬──────┘        └─────┬────┘         └──────┬─────┘
     │                        │                          │                     │                      │
     │ Queue Message          │                          │                     │                      │
     │ {                      │                          │                     │                      │
     │   subscriptionId,      │                          │                     │                      │
     │   resource,            │                          │                     │                      │
     │   changeType           │                          │                     │                      │
     │ }                      │                          │                     │                      │
     │───────────────────────>│                          │                     │                      │
     │                        │                          │                     │                      │
     │                        │ 1. Extract Drive ID      │                     │                      │
     │                        │    from resource path    │                     │                      │
     │                        │                          │                     │                      │
     │                        │ 2. Get Delta Token       │                     │                      │
     │                        │─────────────────────────────────────────────────────────────────────>│
     │                        │                          │                     │                      │
     │                        │                          │ SELECT delta_token, last_sync              │
     │                        │                          │ FROM delta_state                           │
     │                        │                          │ WHERE drive_id = ?                         │
     │                        │                          │                     │                      │
     │                        │ Delta Token              │                     │                      │
     │                        │<─────────────────────────────────────────────────────────────────────│
     │                        │                          │                     │                      │
     │                        │ 3. Execute Delta Query   │                     │                      │
     │                        │─────────────────────────>│                     │                      │
     │                        │                          │                     │                      │
     │                        │                          │ 4. GET {deltaLink}  │                      │
     │                        │                          │    or /root/delta   │                      │
     │                        │                          │────────────────────>│                      │
     │                        │                          │                     │                      │
     │    ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
     │    │ loop [While @odata.nextLink exists]                                                             │
     │    │────────────────────────────────────────────────────────────────────────────────────────────────│
     │    │                    │                          │                     │                      │
     │    │                    │                          │ Delta Response      │                      │
     │    │                    │                          │ {                   │                      │
     │    │                    │                          │   value: [          │                      │
     │    │                    │                          │     {               │                      │
     │    │                    │                          │       id,           │                      │
     │    │                    │                          │       name,         │                      │
     │    │                    │                          │       parentReference,                     │
     │    │                    │                          │       file/folder,  │                      │
     │    │                    │                          │       deleted       │                      │
     │    │                    │                          │     }               │                      │
     │    │                    │                          │   ],                │                      │
     │    │                    │                          │   @odata.nextLink,  │                      │
     │    │                    │                          │   @odata.deltaLink  │                      │
     │    │                    │                          │ }                   │                      │
     │    │                    │                          │<────────────────────│                      │
     │    │                    │                          │                     │                      │
     │    │                    │ Items                    │                     │                      │
     │    │                    │<─────────────────────────│                     │                      │
     │    │                    │                          │                     │                      │
     │    │    ┌────────────────────────────────────────────────────────────────────────────────────────────┐
     │    │    │ loop [For each item in batch]                                                              │
     │    │    │────────────────────────────────────────────────────────────────────────────────────────────│
     │    │    │                │                          │                     │                      │
     │    │    │                │ 5. Get Existing Item     │                     │                      │
     │    │    │                │─────────────────────────────────────────────────────────────────────>│
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ SELECT * FROM drive_items                  │
     │    │    │                │                          │ WHERE item_id = ?                          │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Existing Item (or null)  │                     │                      │
     │    │    │                │<─────────────────────────────────────────────────────────────────────│
     │    │    │                │                          │                     │                      │
     │    │    │                │ 6. Detect Change Type    │                     │                      │
     │    │    │                │─────────────────────────>│                     │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ Compare:            │                      │
     │    │    │                │                          │ - Item existence    │                      │
     │    │    │                │                          │ - Name changes      │                      │
     │    │    │                │                          │ - Parent changes    │                      │
     │    │    │                │                          │ - Deleted flag      │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │ ChangeType              │                     │                      │
     │    │    │                │ (CREATE/RENAME/         │                     │                      │
     │    │    │                │  MOVE/DELETE/UPDATE)    │                     │                      │
     │    │    │                │<─────────────────────────│                     │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │ 7. Build Full Path       │                     │                      │
     │    │    │                │─────────────────────────>│                     │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ Traverse parent_id  │                      │
     │    │    │                │                          │ hierarchy to root   │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Full Path               │                     │                      │
     │    │    │                │<─────────────────────────│                     │                      │
     │    │    │                │                          │                     │                      │
     │    │    │                │ 8. Start Transaction     │                     │                      │
     │    │    │                │─────────────────────────────────────────────────────────────────────>│
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ BEGIN TRANSACTION                          │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Transaction Started      │                     │                      │
     │    │    │                │<─────────────────────────────────────────────────────────────────────│
     │    │    │                │                          │                     │                      │
     │    │    │                │ 9. Upsert DriveItem      │                     │                      │
     │    │    │                │─────────────────────────────────────────────────────────────────────>│
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ INSERT INTO drive_items                    │
     │    │    │                │                          │ (item_id, name, parent_id, path, ...)     │
     │    │    │                │                          │ VALUES (?, ?, ?, ?, ...)                   │
     │    │    │                │                          │ ON CONFLICT (item_id)                      │
     │    │    │                │                          │ DO UPDATE SET                             │
     │    │    │                │                          │   name = EXCLUDED.name,                    │
     │    │    │                │                          │   parent_id = EXCLUDED.parent_id,          │
     │    │    │                │                          │   path = EXCLUDED.path,                    │
     │    │    │                │                          │   modified_at = EXCLUDED.modified_at,      │
     │    │    │                │                          │   is_deleted = EXCLUDED.is_deleted         │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Row Updated/Inserted     │                     │                      │
     │    │    │                │<─────────────────────────────────────────────────────────────────────│
     │    │    │                │                          │                     │                      │
     │    │    │                │ 10. Insert ChangeEvent   │                     │                      │
     │    │    │                │─────────────────────────────────────────────────────────────────────>│
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ INSERT INTO change_events                  │
     │    │    │                │                          │ (drive_item_id, event_type,                │
     │    │    │                │                          │  old_name, new_name,                       │
     │    │    │                │                          │  old_parent_id, new_parent_id,             │
     │    │    │                │                          │  timestamp)                               │
     │    │    │                │                          │ VALUES (?, ?, ?, ?, ?, ?, ?)               │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Event Inserted           │                     │                      │
     │    │    │                │<─────────────────────────────────────────────────────────────────────│
     │    │    │                │                          │                     │                      │
     │    │    │                │ 11. Commit Transaction   │                     │                      │
     │    │    │                │─────────────────────────────────────────────────────────────────────>│
     │    │    │                │                          │                     │                      │
     │    │    │                │                          │ COMMIT                                     │
     │    │    │                │                          │                     │                      │
     │    │    │                │ Committed                │                     │                      │
     │    │    │                │<─────────────────────────────────────────────────────────────────────│
     │    │    └────────────────────────────────────────────────────────────────────────────────────────────┘
     │    │                    │                          │                     │                      │
     │    │                    │ 12. Get Next Page        │                     │                      │
     │    │                    │─────────────────────────>│                     │                      │
     │    │                    │                          │                     │                      │
     │    │                    │                          │ 13. GET {nextLink}  │                      │
     │    │                    │                          │────────────────────>│                      │
     │    └────────────────────────────────────────────────────────────────────────────────────────────────┘
     │                        │                          │                     │                      │
     │                        │ 14. Extract Delta Link   │                     │                      │
     │                        │─────────────────────────>│                     │                      │
     │                        │                          │                     │                      │
     │                        │                          │ Parse @odata.deltaLink                     │
     │                        │                          │ from final response │                      │
     │                        │                          │                     │                      │
     │                        │ New Delta Token          │                     │                      │
     │                        │<─────────────────────────│                     │                      │
     │                        │                          │                     │                      │
     │                        │ 15. Update Delta State   │                     │                      │
     │                        │─────────────────────────────────────────────────────────────────────>│
     │                        │                          │                     │                      │
     │                        │                          │ INSERT INTO delta_state                    │
     │                        │                          │ (drive_id, delta_token, last_sync)         │
     │                        │                          │ VALUES (?, ?, NOW())                       │
     │                        │                          │ ON CONFLICT (drive_id)                     │
     │                        │                          │ DO UPDATE SET                             │
     │                        │                          │   delta_token = EXCLUDED.delta_token,      │
     │                        │                          │   last_sync = NOW()                        │
     │                        │                          │                     │                      │
     │                        │ State Updated            │                     │                      │
     │                        │<─────────────────────────────────────────────────────────────────────│
     │                        │                          │                     │                      │
     │ Message Completed      │                          │                     │                      │
     │<───────────────────────│                          │                     │                      │
     │                        │                          │                     │                      │
```

### Key Steps

1. **Initialization (Steps 1-2)**
   - Extract drive ID from queue message
   - Retrieve current delta token from database
   - Handle missing token (first sync scenario)

2. **Delta Query (Steps 3-4)**
   - Call Microsoft Graph delta endpoint
   - Use stored delta token for incremental sync
   - Handle pagination for large result sets

3. **Item Processing Loop (Steps 5-11)**
   - For each item in delta response:
     - Retrieve existing item from database
     - Detect change type (create/rename/move/delete)
     - Build full hierarchical path
     - Start database transaction
     - Upsert drive_items record
     - Insert change_events record
     - Commit transaction

4. **Change Detection Logic (Step 6)**
   - **CREATE:** Item doesn't exist in database
   - **RENAME:** Name changed, same parent_id
   - **MOVE:** parent_id changed, same or different name
   - **DELETE:** deleted flag set in Graph response
   - **UPDATE:** Other metadata changed

5. **Pagination (Steps 12-13)**
   - Check for @odata.nextLink in response
   - Fetch subsequent pages
   - Continue until @odata.deltaLink received

6. **State Update (Steps 14-15)**
   - Extract new delta token from @odata.deltaLink
   - Update delta_state table
   - Record last_sync timestamp

### Change Detection Examples

**CREATE:**
```typescript
// Item not in database
existingItem === null
changeType = ChangeType.CREATE
```

**RENAME:**
```typescript
// Name changed, same parent
deltaItem.name !== existingItem.name
deltaItem.parentReference.id === existingItem.parent_id
changeType = ChangeType.RENAME
```

**MOVE:**
```typescript
// Parent changed
deltaItem.parentReference.id !== existingItem.parent_id
changeType = ChangeType.MOVE
```

**DELETE:**
```typescript
// Deleted flag set
deltaItem.deleted !== undefined
changeType = ChangeType.DELETE
```

### Error Handling

**Retry Logic:**
- Transient Graph API errors: Exponential backoff, max 5 retries
- Database errors: Rollback transaction, retry message
- Persistent failures: Move to dead letter queue

**Transaction Management:**
- Each item processed in separate transaction
- Rollback on error preserves data consistency
- Delta token updated only after all items processed

**Dead Letter Queue:**
- Messages that fail after max retries
- Manual inspection and reprocessing
- Alerts sent to operations team

---

## Component Interactions

### Service Layer Dependencies

```
┌─────────────────────────────────────────────────┐
│              Function Layer                      │
│  startRoutine                                    │
│  onOneDriveWebhookNotification                  │
│  processDeltaBatch                              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Service Layer                       │
├──────────────────────────────────────────────────┤
│  GraphClient                                    │
│    ├─ authenticate()                            │
│    ├─ createSubscription()                      │
│    ├─ renewSubscription()                       │
│    ├─ performDeltaQuery()                       │
│    └─ handlePagination()                        │
│                                                  │
│  DeltaProcessor                                 │
│    ├─ parseResponse()                           │
│    ├─ detectChangeType()                        │
│    ├─ buildPath()                               │
│    └─ processBatch()                            │
│                                                  │
│  SubscriptionService                            │
│    ├─ ensureSubscription()                      │
│    ├─ monitorExpiration()                       │
│    └─ renewBeforeExpiry()                       │
│                                                  │
│  DatabaseClient                                 │
│    ├─ getConnection()                           │
│    ├─ executeQuery()                            │
│    ├─ beginTransaction()                        │
│    └─ commit/rollback()                         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│          Repository Layer                        │
├──────────────────────────────────────────────────┤
│  DriveItemRepository                            │
│    ├─ upsert()                                  │
│    ├─ findByItemId()                            │
│    ├─ markDeleted()                             │
│    └─ getChildren()                             │
│                                                  │
│  ChangeEventRepository                          │
│    ├─ insert()                                  │
│    ├─ findByItem()                              │
│    └─ findByDateRange()                         │
│                                                  │
│  DeltaStateRepository                           │
│    ├─ getDeltaToken()                           │
│    ├─ updateDeltaToken()                        │
│    └─ getLastSync()                             │
│                                                  │
│  WebhookSubscriptionRepository                  │
│    ├─ save()                                    │
│    ├─ findBySubscriptionId()                    │
│    └─ findExpiring()                            │
└──────────────────────────────────────────────────┘
```

### Data Flow Between Components

1. **Function → Service:**
   - Functions call service methods
   - Pass primitive types and DTOs
   - Receive processed results

2. **Service → Repository:**
   - Services use repositories for persistence
   - Repositories return domain objects
   - Services orchestrate business logic

3. **Service → External APIs:**
   - GraphClient wraps Microsoft Graph
   - Handles authentication and retries
   - Returns typed responses

---

## Error Handling Flows

### Transient Error Retry Flow

```
Function Call
     │
     ▼
Try Service Method
     │
     ├─[Success]──────────> Return Result
     │
     ├─[Transient Error]
     │      │
     │      ▼
     │  Wait (exponential backoff)
     │      │
     │      ▼
     │  Retry (attempt < max)
     │      │
     │      └──> [Loop back to Try]
     │
     └─[Permanent Error]──> Log & Throw
```

### Transaction Rollback Flow

```
Start Transaction
     │
     ▼
Execute Operations
     │
     ├─[All Successful]
     │      │
     │      ▼
     │  Commit Transaction
     │      │
     │      ▼
     │  Return Success
     │
     └─[Any Failure]
            │
            ▼
        Rollback Transaction
            │
            ▼
        Log Error
            │
            ▼
        Throw Exception
```

### Queue Message Retry Flow

```
Receive Queue Message
     │
     ▼
Process Message
     │
     ├─[Success]
     │      │
     │      ▼
     │  Delete from Queue
     │      │
     │      ▼
     │  Return
     │
     ├─[Transient Failure]
     │      │
     │      ▼
     │  Leave in Queue
     │      │
     │      ▼
     │  Auto-retry (queue mechanism)
     │
     └─[Max Retries Exceeded]
            │
            ▼
        Move to Dead Letter Queue
            │
            ▼
        Alert Operations
```

---

## Performance Considerations

### Pagination Strategy

- Process delta responses in batches
- Maximum 200 items per Graph API call
- Use @odata.nextLink for continuation
- Store progress to handle interruptions

### Database Optimization

- Use connection pooling
- Batch inserts where possible
- Index frequently queried columns
- Use transactions for consistency

### Webhook Response Time

- Return 200/202 within 5 seconds
- Async processing via queue
- Microsoft Graph timeout: 30 seconds
- Avoid synchronous heavy operations

---

## Appendix

### Queue Message Schema

```typescript
interface DeltaProcessingMessage {
  subscriptionId: string;
  resource: string;
  changeType: string;
  timestamp: string;
  correlationId?: string;
}
```

### Delta Response Schema

```typescript
interface DeltaResponse {
  '@odata.context': string;
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  value: DriveItem[];
}

interface DriveItem {
  id: string;
  name: string;
  parentReference?: {
    driveId: string;
    id: string;
    path?: string;
  };
  file?: {};
  folder?: {};
  deleted?: {
    state: string;
  };
  lastModifiedDateTime: string;
}
```

### Change Event Types

```typescript
enum ChangeType {
  CREATE = 'CREATE',
  RENAME = 'RENAME',
  MOVE = 'MOVE',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE'
}
```

---

**Document Maintained By:** Solution Architect Agent  
**Review Cycle:** Quarterly or on major flow changes  
**Related Documents:** 
- [architecture.md](./architecture.md) - System architecture overview
- [uml-class-data-model.md](./uml-class-data-model.md) - Data model diagrams (TBD)

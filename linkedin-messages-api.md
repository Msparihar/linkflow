# LinkedIn Messages API Documentation

## Overview

LinkedIn's Messages API enables approved partners to create messages and reply to existing conversations with first-degree connections. The Compliance Events API monitors member messaging activities.

## Key Requirements

- Members must actively opt-in to message sending (not opt-out)
- Messages require "a specific member action" and must be sent "at, or around the time the member took action"
- Pre-prepared messages need member approval before sending
- The platform prohibits HTML content and incentivizing message sending/receiving

## Core Endpoints

### Create New Message

```
POST https://api.linkedin.com/v2/messages
```

**Required Fields:**
- `recipients` - Array of Person URNs

**Optional Fields:**
- `subject` - Message subject
- `body` - Message content
- `messageType` - Type of message
- `attachments` - Array of attachments

### Reply to Conversation

```
POST https://api.linkedin.com/v2/messages
```

- Uses either `recipients` or `thread` parameter (mutually exclusive)
- Returns HTTP 201 with message ID in header

## Schema Fields

| Field | Description |
|-------|-------------|
| **id** | Message entity ID (read-only) |
| **body** | Message content (required) |
| **messageType** | `MEMBER_TO_MEMBER` enum |
| **thread** | MessagingThread URN for existing conversations |
| **attachments** | DigitalMediaAsset URN array |

## Attachment Workflow

1. Register upload via `registerUpload` action
2. Upload file to provided URL
3. Monitor upload status using Asset ID
4. Create message with DigitalMediaAsset URN

**Recipe required:** `urn:li:digitalmediaRecipe:messaging-attachment`

## Important Restrictions

API access is restricted to approved partners, subject to limitations via API agreement.

## Source

[Microsoft Learn - LinkedIn Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages)

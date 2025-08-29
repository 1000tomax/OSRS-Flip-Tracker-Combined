# Sentry + Discord Alert Setup

## The Problem with Multiple Discord Webhooks

Discord webhooks are channel-specific, but Sentry's Discord integration
typically only allows ONE webhook destination per project. This makes routing
different error types to different channels challenging.

## Recommended Solution: Single Channel with Visual Distinction

### Step 1: Create Single Discord Channel

Create one `#guest-errors` channel in Discord for all error notifications.

### Step 2: Create Discord Webhook

1. Go to your Discord server → `#guest-errors` channel
2. Channel Settings → Integrations → Webhooks
3. Create New Webhook
4. Copy webhook URL

### Step 3: Configure Sentry Integration

1. In Sentry Dashboard → Settings → Integrations → Discord
2. Add the single webhook URL from Step 2

### Step 4: Set Up Alert Rules with Visual Distinction

#### Rule 1: "User Errors - No Action Needed"

- **When**: An event is seen
- **If**: `error_type` equals `invalid_format` OR `show_buying_enabled`
- **Then**: Send Discord notification with template:
  ```
  🟢 **USER ERROR - NO ACTION NEEDED**
  Error: {error.type}
  File: {contexts.upload_attempt.fileName} ({contexts.upload_attempt.fileSize} bytes)
  Message: {error.value}
  ```
- **Rate limit**: Once per hour (avoid spam)

#### Rule 2: "Critical Errors - Investigate"

- **When**: An event is seen
- **If**: `error_type` equals `worker_crash` OR `component` equals
  `upload_handler`
- **Then**: Send Discord notification with template:
  ```
  🔴 **@everyone CRITICAL ERROR - INVESTIGATE**
  Error: {error.type}
  Component: {tags.component}
  File: {contexts.upload_attempt.fileName} ({contexts.upload_attempt.fileSize} bytes)
  Message: {error.value}
  ```
- **Rate limit**: Every occurrence

#### Rule 3: "Processing Errors - Monitor"

- **When**: An event is seen
- **If**: `error_type` equals `processing_error`
- **Then**: Send Discord notification with template:
  ```
  🟡 **PROCESSING ERROR - MONITOR**
  Error: {error.type}
  Component: {tags.component}
  Message: {error.value}
  ```
- **Rate limit**: Once per 15 minutes

## Enhanced Error Classification

The code now includes these tags for better routing:

- `error_type`: Specific error classification
- `severity`: low/medium/high
- `user_error`: true/false
- `action_needed`: none/investigate/monitor
- `component`: Source component

## Alternative: Custom Webhook Router

If you really need separate channels, use a service like:

- Zapier/Make/n8n to receive Sentry webhooks
- Route based on error tags to different Discord channels
- More complex but gives true multi-channel routing

## Testing Your Setup

1. Upload a wrong CSV format → Should trigger 🟢 user error
2. Cause a worker crash → Should trigger 🔴 critical error
3. Check Discord channel for proper formatting and rate limiting

# Project Blueprint

## Overview
google-chat is a headless event-driven service deployed as a Firebase Cloud Function (Node.js v2). It acts as an integration layer between Google Workspace and Google Chat.

Its primary function is to securely monitor a Google Shared Drive for activities (like file creations, edits, deletions, or moves) and broadcast these events as structured Google Chat Cards to a designated space via webhooks.

## Architecture & Features

### Current State:
* **Framework:** Firebase Cloud Functions v2 (`firebase-functions/v2`) running Node.js.
* **Architecture:** Headless, API-First, Event-driven. (All frontend UI/Next.js/React elements have been stripped out).
* **Core Logic:** `functions/src/index.ts`
* **Trigger:** Scheduled CRON job (`onSchedule`) running every 5 minutes.
* **Authentication Strategy:** Secure Keyless Authentication using Google Application Default Credentials (ADC). The function relies entirely on its attached Service Account for permissions to interact with Google APIs rather than using static JSON keys.
* **Data Retrieval:** Uses the `googleapis` package to query `driveactivity.v2` filtering by the Shared Drive ID and a time window determined by the last successful execution time.
* **State Management:** Uses Firebase Firestore to persist the timestamp of the last successful run (`system_metadata/monitor_state`). This ensures no events are missed due to execution latency or function cold starts.
* **Identity Resolution:** Uses `people.v1` API to map opaque Google `personName` identifiers to readable user email addresses. Implements a fast in-memory object cache to eliminate redundant API calls within the execution loop.
* **Filtering:** Explicitly ignores non-actionable events, specifically `view` and `comment` action types.
* **Notification Mechanism:** Sends POST requests to a Google Chat Webhook using native `fetch`. Payload is strictly formatted to the Google Chat `cardsV2` specification.
* **Logging:** Utilizes the official `firebase-functions/logger` for structured MLOps-compliant logging instead of `console.log`.
* **Secrets Management:** Integrates with Firebase Secret Manager via `defineSecret` to securely retrieve `CHAT_WEBHOOK_URL` and `SHARED_DRIVE_ID` at runtime. Hardcoded secrets are explicitly avoided.

### Development Standards & Security:
* Ensure all development is strictly server-side. Do not install or run client-side frameworks.
* Maintain Strict TypeScript definitions for payloads and API schemas where possible.
* Webhook endpoints or API routes exposed via `onRequest` (if implemented in the future) MUST NOT be exposed publicly without robust authorization logic (e.g., verifying API keys or checking Identity tokens) to prevent abuse.
* Ensure IAM roles assigned to the function's service account follow the Principle of Least Privilege (e.g., granting exactly `Drive Activity Viewer`, `People API Reader`, and `Firestore User`, nothing more).
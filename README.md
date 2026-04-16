# BrainFaiRT Monitor: Headless Event-Driven Service

STATUS: WIP / BROKEN. Saved mid-development due to cloud migration.

## Overview

BrainFaiRT Monitor is a secure, headless Firebase Cloud Function (Node.js v22) architected to act as an integration layer between Google Workspace and Google Chat. It monitors a designated Google Shared Drive for actionable events (creations, edits, moves, deletions) and broadcasts these events to a Google Chat space via a strictly formatted `cardsV2` webhook payload.

Built with strict MLOps and DevSecOps standards, this service operates entirely server-side, utilizing keyless authentication and structured logging.

## Architecture & DevSecOps Standards

* **Keyless Authentication (ADC):** Eliminates the need for hardcoded JSON keys. The function assumes the identity of its attached Google Cloud Service Account via Application Default Credentials.
* **Secrets Management:** Integrates natively with Google Cloud Secret Manager via Firebase `defineSecret` to retrieve sensitive configurations (`CHAT_WEBHOOK_URL`, `SHARED_DRIVE_ID`) strictly at runtime.
* **Principle of Least Privilege:** Enforces strict IAM boundaries. The service account requires only `Drive Activity Viewer` and `People API Reader` roles.
* **MLOps Compliant Logging:** Replaces standard console outputs with `firebase-functions/logger` for structured, queryable telemetry.
* **Smart Filtering:** Explicitly ignores non-actionable events such as `view` and `comment` to reduce noise and optimize execution cycles.
* **API Hygiene:** Utilizes an in-memory execution cache to map opaque `personName` identifiers to readable emails via the `people.v1` API, minimizing external API calls.

## Prerequisites

* [Node.js v22+](https://nodejs.org/)
* [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
* A Google Cloud / Firebase project on the **Blaze (Pay-as-you-go) Plan**
* Google Cloud APIs Enabled:
  * Google Drive Activity API
  * Google People API
  * Cloud Scheduler API
  * Secret Manager API

---

## 🚀 Quick Start Guide

### 1. Initialize and Install

Clone the repository and install the backend dependencies. **Note:** This is a strictly server-side project. Do not install client-side frameworks.

```bash
git clone <repository_url>
cd brainfairt/functions
npm install
```

Authenticate with Firebase and set your active project:

```bash
firebase login
firebase use <YOUR_PROJECT_ID>
```

### 2. Populate Secret Values

Do not use `.env` files for production credentials. Inject your secrets securely into Google Cloud Secret Manager via the Firebase CLI:

```bash
firebase functions:secrets:set CHAT_WEBHOOK_URL
# Paste your Google Chat Webhook URL when prompted

firebase functions:secrets:set SHARED_DRIVE_ID
# Paste your Google Shared Drive ID when prompted
```

### 3. Configure IAM & Drive Access

For the function to successfully monitor the Shared Drive using its keyless ADC identity:
1. Locate your default App Engine/Compute service account (usually `your-project-id@appspot.gserviceaccount.com`).
2. Navigate to your Google Shared Drive.
3. Add this service account email as a **Viewer** to the Shared Drive.

*Ensure this Service Account also has the `People API Reader` role in Google Cloud IAM.*

### 4. Build and Test Locally

Compile the TypeScript definitions to ensure payload and API schema integrity:

```bash
npm run build
```

To test the function's execution environment locally (optional, requires emulator setup):

```bash
firebase emulators:start --only functions
```

### 5. Deploy to Production

Deploy the function to Firebase. Once deployed, Google Cloud Scheduler will automatically trigger the `monitorBrainFaiRT` function every 5 minutes asynchronously.

```bash
firebase deploy --only functions:monitorBrainFaiRT
```

Monitor your live structured telemetry in the [Firebase Functions Logs Console](https://console.firebase.google.com/project/_/functions/logs).
# Project Blueprint

## Overview
This project is a Next.js application integrated with Firebase, utilizing the App Router structure. It includes Cloud Functions for backend logic, specifically monitoring Google Drive activity.

## Security Constraints
- **Authentication**: Must use Application Default Credentials (ADC) via `google-auth-library` or `googleapis`. **Do NOT use JSON key files.** The function relies on its own managed service account identity.

## Project Outline
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Backend/Services**: Firebase (Analytics, AI, Cloud Functions, Secrets Manager, Cloud Build, Artifact Registry)
- **Environment**: Firebase Studio

## Recent Changes
- **Security**: Explicitly documented and verified ADC usage for Cloud Functions.
- **Cloud Functions**:
    -   Refactored `monitorBrainFaiRT` to use Firebase Secrets (`CHAT_WEBHOOK_URL`, `SHARED_DRIVE_ID`).
    -   Updated `functions/tsconfig.json` to CommonJS.
    -   Updated `functions/package.json` to specify `node: 20` engine.
- **IAM Permissions**:
    -   Added `roles/storage.objectViewer` to default compute service account.
    -   Added `roles/artifactregistry.writer` to default compute service account.

## Current Plan: Fix Analytics Type Error
The error `Argument of type 'Analytics | null' is not assignable to parameter of type 'Analytics'` occurs because `firebaseModule.analytics` can be `null` (as defined in `src/lib/firebase.ts`), but `logEvent` expects a non-null `Analytics` instance.

### Steps
1.  **Update `src/app/page.tsx`**:
    -   Store `firebaseModule.analytics` in a local variable to ensure type narrowing works correctly.
    -   Or assert non-nullability inside the `if` block.

# Security Standards

This project adheres strictly to serverless security best practices tailored for Google Cloud Platform and Firebase. All development and operational changes must align with these guidelines to maintain a robust, keyless, and secure architecture.

## 1. Authentication and Authorization
* **Keyless Architecture**: Never use, store, or commit long-lived JSON service account keys or API keys. Always rely on Application Default Credentials (ADC).
* **Identity Context**: The Cloud Function relies entirely on the identity of its attached Google Cloud Service Account.
* **Principle of Least Privilege**: The service account executing the Cloud Function must have the minimum necessary IAM permissions required for the task. Specifically, it should only have access to `Drive Activity Viewer` and `People API Reader`.
* **Public Endpoints**: Any HTTP-triggered function (e.g., using `onRequest`) must implement strong authorization logic (such as verifying a bearer token, API key, or custom headers) and must **never** be exposed publicly without validation. Mock or test webhooks must be strictly internal or secured.

## 2. Secrets Management
* **Firebase Secret Manager**: All sensitive configuration values, such as the `CHAT_WEBHOOK_URL` and `SHARED_DRIVE_ID`, must be stored in Google Cloud Secret Manager and accessed via Firebase's `defineSecret`.
* **Environment Variables**: Avoid using plain text `.env` files for highly sensitive credentials in production. Never hardcode secrets in source files.

## 3. Data Privacy and Handling
* **Logging Standards**: Use `firebase-functions/logger` for structured logging. Never log PII (Personally Identifiable Information), sensitive user data, or full request/response bodies from the Google Drive or People APIs.
* **In-Memory Caching**: Caching mechanisms (like the `emailCache` object) are strictly scoped to the lifecycle of a single function execution. Do not persist sensitive user mappings across executions without proper encryption or secure storage (like Firestore with strict security rules).

## 4. Input Validation and API Hygiene
* Validate and sanitize all external inputs, especially if introducing new HTTP endpoints or processing complex webhook payloads.
* Ensure all external API calls (e.g., Google Drive, People API) are wrapped in `try...catch` blocks to gracefully handle errors, timeouts, and rate limits without exposing stack traces.
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { google } from "googleapis";
import * as logger from "firebase-functions/logger";
import { generateChatCard } from "./cardBuilder";

admin.initializeApp();
const db = admin.firestore();

const chatWebhookUrl = defineSecret("CHAT_WEBHOOK_URL");
const sharedDriveIdSecret = defineSecret("SHARED_DRIVE_ID");

// Simple local cache for email resolution during the execution loop
const emailCache: Record<string, string> = {};

async function resolveEmail(personName: string, auth: any): Promise<string> {
    if (emailCache[personName]) {
        return emailCache[personName];
    }

    const people = google.people({ version: "v1", auth });
    try {
        const res = await people.people.get({
            resourceName: personName,
            personFields: "emailAddresses",
        });
        const email = res.data.emailAddresses?.[0]?.value || "Unknown Email";
        emailCache[personName] = email;
        return email;
    } catch (error) {
        logger.error(`Failed to resolve email for ${personName}`, error);
        return "Unknown Email";
    }
}

export const monitorBrainFaiRT = onSchedule({
    schedule: "every 5 minutes",
    secrets: [chatWebhookUrl, sharedDriveIdSecret],
}, async (event) => {
    // Capture the start time of this execution to save as the next checkpoint
    const executionStartTime = Date.now();

    // Keyless Authentication: Automatically uses Application Default Credentials (ADC)
    // The function assumes the identity of its attached Service Account.
    const auth = new google.auth.GoogleAuth({
        scopes: [
            "https://www.googleapis.com/auth/drive.activity.readonly",
            "https://www.googleapis.com/auth/people.readonly"
        ],
    });

    const driveactivity = google.driveactivity({ version: "v2", auth });
    const sharedDriveId = sharedDriveIdSecret.value().trim();

    // Retrieve the last successful run time from Firestore
    const metadataRef = db.collection('system_metadata').doc('monitor_state');
    let lastRunTime: number;

    try {
        const doc = await metadataRef.get();
        if (doc.exists && doc.data()?.lastRunTime) {
            lastRunTime = doc.data()!.lastRunTime;
            logger.info(`Loaded last run time: ${new Date(lastRunTime).toISOString()}`);
        } else {
            // Fallback: 5 minutes ago if no state exists
            lastRunTime = executionStartTime - 5 * 60 * 1000;
            logger.info(`No previous run time found. Defaulting to 5 minutes ago: ${new Date(lastRunTime).toISOString()}`);
        }
    } catch (error) {
        logger.error("Failed to retrieve last run time from Firestore", error);
        // Fallback to avoid breaking execution
        lastRunTime = executionStartTime - 5 * 60 * 1000;
    }

    try {
        const response = await driveactivity.activity.query({
            requestBody: {
                ancestorName: `items/${sharedDriveId}`,
                filter: `time > ${lastRunTime}`,
            },
        });

        const activities = response.data.activities || [];
        logger.info(`Found ${activities.length} activities since ${new Date(lastRunTime).toISOString()}`);

        const webhookUrl = chatWebhookUrl.value().trim();

        for (const activity of activities) {
            const actionDetail = activity.primaryActionDetail;
            // Ignore view or comment actions. The ActionDetail interface requires using Object.keys to check for specific action types.
            if (!actionDetail) continue;

            const actionType = Object.keys(actionDetail)[0];
            if (actionType === 'view' || actionType === 'comment') {
                continue;
            }

            // Extract Actor details & Resolve Identity
            const actor = activity.actors?.[0];
            const personName = actor?.user?.knownUser?.personName;
            let actorEmail = "Unknown User";
            if (personName) {
                actorEmail = await resolveEmail(personName, auth);
            }

            // Extract Target details
            const target = activity.targets?.[0];
            const driveItem = target?.driveItem;
            const fileName = driveItem?.title || "Unknown File";
            const itemName = driveItem?.name; // Format is typically 'items/FILE_ID'
            const fileId = itemName ? itemName.replace("items/", "") : "";
            const fileUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view` : "https://drive.google.com";

            // Output Formatting: Google Chat CardV2 via helper
            const cardMessage = generateChatCard(activity, actionType, actorEmail, fileName, fileUrl);

            // Notification: Send POST request to Google Chat Webhook URL
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cardMessage),
            });

            logger.info(`Processed activity for file: ${fileName}, action: ${actionType}`);
        }

        // Save the new checkpoint time to Firestore only after successful execution
        await metadataRef.set({ lastRunTime: executionStartTime });
        logger.info(`Updated last run time to: ${new Date(executionStartTime).toISOString()}`);

    } catch (error) {
        logger.error("Error monitoring Drive Activity", error);
    }
});

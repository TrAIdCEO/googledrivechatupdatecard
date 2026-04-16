"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorgoogle-chat = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const googleapis_1 = require("googleapis");
const logger = __importStar(require("firebase-functions/logger"));
const cardBuilder_1 = require("./cardBuilder");
admin.initializeApp();
const db = admin.firestore();
const chatWebhookUrl = (0, params_1.defineSecret)("CHAT_WEBHOOK_URL");
const sharedDriveIdSecret = (0, params_1.defineSecret)("SHARED_DRIVE_ID");
// Simple local cache for email resolution during the execution loop
const emailCache = {};
async function resolveEmail(personName, auth) {
    var _a, _b;
    if (emailCache[personName]) {
        return emailCache[personName];
    }
    const people = googleapis_1.google.people({ version: "v1", auth });
    try {
        const res = await people.people.get({
            resourceName: personName,
            personFields: "emailAddresses",
        });
        const email = ((_b = (_a = res.data.emailAddresses) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || "Unknown Email";
        emailCache[personName] = email;
        return email;
    }
    catch (error) {
        logger.error(`Failed to resolve email for ${personName}`, error);
        return "Unknown Email";
    }
}
exports.monitorgoogle-chat = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    secrets: [chatWebhookUrl, sharedDriveIdSecret],
}, async (event) => {
    var _a, _b, _c, _d, _e;
    // Capture the start time of this execution to save as the next checkpoint
    const executionStartTime = Date.now();
    // Keyless Authentication: Automatically uses Application Default Credentials (ADC)
    // The function assumes the identity of its attached Service Account.
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: [
            "https://www.googleapis.com/auth/drive.activity.readonly",
            "https://www.googleapis.com/auth/people.readonly"
        ],
    });
    const driveactivity = googleapis_1.google.driveactivity({ version: "v2", auth });
    const sharedDriveId = sharedDriveIdSecret.value().trim();
    // Retrieve the last successful run time from Firestore
    const metadataRef = db.collection('system_metadata').doc('monitor_state');
    let lastRunTime;
    try {
        const doc = await metadataRef.get();
        if (doc.exists && ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.lastRunTime)) {
            lastRunTime = doc.data().lastRunTime;
            logger.info(`Loaded last run time: ${new Date(lastRunTime).toISOString()}`);
        }
        else {
            // Fallback: 5 minutes ago if no state exists
            lastRunTime = executionStartTime - 5 * 60 * 1000;
            logger.info(`No previous run time found. Defaulting to 5 minutes ago: ${new Date(lastRunTime).toISOString()}`);
        }
    }
    catch (error) {
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
            if (!actionDetail)
                continue;
            const actionType = Object.keys(actionDetail)[0];
            if (actionType === 'view' || actionType === 'comment') {
                continue;
            }
            // Extract Actor details & Resolve Identity
            const actor = (_b = activity.actors) === null || _b === void 0 ? void 0 : _b[0];
            const personName = (_d = (_c = actor === null || actor === void 0 ? void 0 : actor.user) === null || _c === void 0 ? void 0 : _c.knownUser) === null || _d === void 0 ? void 0 : _d.personName;
            let actorEmail = "Unknown User";
            if (personName) {
                actorEmail = await resolveEmail(personName, auth);
            }
            // Extract Target details
            const target = (_e = activity.targets) === null || _e === void 0 ? void 0 : _e[0];
            const driveItem = target === null || target === void 0 ? void 0 : target.driveItem;
            const fileName = (driveItem === null || driveItem === void 0 ? void 0 : driveItem.title) || "Unknown File";
            const itemName = driveItem === null || driveItem === void 0 ? void 0 : driveItem.name; // Format is typically 'items/FILE_ID'
            const fileId = itemName ? itemName.replace("items/", "") : "";
            const fileUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view` : "https://drive.google.com";
            // Output Formatting: Google Chat CardV2 via helper
            const cardMessage = (0, cardBuilder_1.generateChatCard)(activity, actionType, actorEmail, fileName, fileUrl);
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
    }
    catch (error) {
        logger.error("Error monitoring Drive Activity", error);
    }
});
//# sourceMappingURL=index.js.map
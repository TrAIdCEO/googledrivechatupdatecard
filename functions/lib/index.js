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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorBrainFaiRT = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const googleapis_1 = require("googleapis");
const axios_1 = __importDefault(require("axios"));
admin.initializeApp();
const chatWebhookUrl = (0, params_1.defineSecret)("CHAT_WEBHOOK_URL");
const sharedDriveId = (0, params_1.defineSecret)("SHARED_DRIVE_ID");
const personCache = new Map();
async function getEmailFromPersonName(personName) {
    var _a, _b;
    if (personCache.has(personName)) {
        return personCache.get(personName);
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.activity.readonly", "https://www.googleapis.com/auth/people.readonly"],
    });
    const people = googleapis_1.google.people({ version: "v1", auth });
    try {
        const response = (await people.people.get({
            resourceName: personName,
            personFields: "emailAddresses",
        })).data;
        const email = (_b = (_a = response.emailAddresses) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
        if (email) {
            personCache.set(personName, email);
            return email;
        }
    }
    catch (error) {
        console.error("Error fetching email:", error);
    }
    return "Unknown";
}
exports.monitorBrainFaiRT = (0, scheduler_1.onSchedule)({
    schedule: "*/5 * * * *",
    secrets: [chatWebhookUrl, sharedDriveId],
}, async () => {
    var _a, _b, _c, _d, _e, _f, _g;
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.activity.readonly"],
    });
    const driveactivity = googleapis_1.google.driveactivity({ version: "v2", auth });
    try {
        const response = await driveactivity.activity.query({
            requestBody: {
                ancestorName: `items/${sharedDriveId.value().trim()}`,
                filter: `time >= "${new Date(Date.now() - 5 * 60 * 1000).toISOString()}"`,
            },
        });
        const activities = response.data.activities;
        if (activities) {
            for (const activity of activities) {
                if (!activity.primaryActionDetail || activity.primaryActionDetail.comment) {
                    continue;
                }
                const personName = (_d = (_c = (_b = (_a = activity.actors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.knownUser) === null || _d === void 0 ? void 0 : _d.personName;
                const actorEmail = personName ? await getEmailFromPersonName(personName) : "Unknown Actor";
                const driveItem = (_f = (_e = activity.targets) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.driveItem;
                const fileId = (_g = driveItem === null || driveItem === void 0 ? void 0 : driveItem.name) === null || _g === void 0 ? void 0 : _g.substring(driveItem.name.lastIndexOf('/') + 1);
                const card = {
                    "cardsV2": [
                        {
                            "cardId": "unique-card-id",
                            "card": {
                                "header": {
                                    "title": "BrainFaiRT Activity",
                                    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/2295px-Google_Drive_icon_%282020%29.svg.png",
                                    "imageType": "CIRCLE"
                                },
                                "sections": [
                                    {
                                        "header": "File Change Detected",
                                        "collapsible": true,
                                        "widgets": [
                                            {
                                                "decoratedText": {
                                                    "topLabel": "File Name",
                                                    "text": driveItem === null || driveItem === void 0 ? void 0 : driveItem.title,
                                                }
                                            },
                                            {
                                                "decoratedText": {
                                                    "topLabel": "Actor Email",
                                                    "text": actorEmail,
                                                }
                                            },
                                            {
                                                "decoratedText": {
                                                    "topLabel": "Action Type",
                                                    "text": Object.keys(activity.primaryActionDetail)[0],
                                                }
                                            },
                                            {
                                                "buttonList": {
                                                    "buttons": [
                                                        {
                                                            "text": "Open File",
                                                            "onClick": {
                                                                "openLink": {
                                                                    "url": `https://drive.google.com/file/d/${fileId}`
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                };
                await axios_1.default.post(chatWebhookUrl.value().trim(), card);
            }
        }
    }
    catch (error) {
        console.error("Error fetching drive activity:", error);
    }
});
//# sourceMappingURL=index.js.map
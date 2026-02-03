import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { google, people_v1 } from "googleapis";
import axios from "axios";

admin.initializeApp();

const chatWebhookUrl = defineSecret("CHAT_WEBHOOK_URL");
const sharedDriveId = defineSecret("SHARED_DRIVE_ID");

const personCache = new Map<string, string>();

async function getEmailFromPersonName(personName: string): Promise<string> {
  if (personCache.has(personName)) {
    return personCache.get(personName)!;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.activity.readonly", "https://www.googleapis.com/auth/people.readonly"],
  });

  const people = google.people({ version: "v1", auth });

  try {
    const response: people_v1.Schema$Person = (await people.people.get({
      resourceName: personName,
      personFields: "emailAddresses",
    })).data;

    const email = response.emailAddresses?.[0]?.value;
    if (email) {
      personCache.set(personName, email);
      return email;
    }
  } catch (error) {
    console.error("Error fetching email:", error);
  }

  return "Unknown";
}

export const monitorBrainFaiRT = onSchedule({
  schedule: "*/5 * * * *",
  secrets: [chatWebhookUrl, sharedDriveId],
}, async () => {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.activity.readonly"],
  });

  const driveactivity = google.driveactivity({ version: "v2", auth });

  try {
    const response = await driveactivity.activity.query({
      requestBody: {
        ancestorName: `items/${sharedDriveId.value()}`,
        filter: `time >= "${new Date(Date.now() - 5 * 60 * 1000).toISOString()}"`,
      },
    });

    const activities = response.data.activities;
    if (activities) {
      for (const activity of activities) {
        if (!activity.primaryActionDetail || activity.primaryActionDetail.comment) {
          continue;
        }

        const personName = activity.actors?.[0]?.user?.knownUser?.personName;
        const actorEmail = personName ? await getEmailFromPersonName(personName) : "Unknown Actor";
        
        const driveItem = activity.targets?.[0]?.driveItem;
        const fileId = driveItem?.name?.substring(driveItem.name.lastIndexOf('/') + 1);

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
                          "text": driveItem?.title,
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
                          "text": Object.keys(activity.primaryActionDetail!)[0],
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

        await axios.post(chatWebhookUrl.value(), card);
      }
    }
  } catch (error) {
    console.error("Error fetching drive activity:", error);
  }
});

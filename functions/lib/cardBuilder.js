"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChatCard = generateChatCard;
function generateChatCard(activity, actionType, actorEmail, fileName, fileUrl) {
    return {
        cardsV2: [
            {
                cardId: `card-${activity.timestamp || Date.now()}`,
                card: {
                    header: {
                        title: "google-chat Monitor",
                        subtitle: `Action: ${actionType.toUpperCase()}`,
                    },
                    sections: [
                        {
                            widgets: [
                                {
                                    textParagraph: {
                                        text: `<b>Actor Email:</b> ${actorEmail}<br><b>File Name:</b> ${fileName}`,
                                    },
                                },
                                {
                                    buttonList: {
                                        buttons: [
                                            {
                                                text: "Open in Drive",
                                                onClick: {
                                                    openLink: {
                                                        url: fileUrl,
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    };
}
//# sourceMappingURL=cardBuilder.js.map
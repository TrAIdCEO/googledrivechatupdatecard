export function generateChatCard(activity: any, actionType: string, actorEmail: string, fileName: string, fileUrl: string) {
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
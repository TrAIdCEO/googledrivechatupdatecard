import { generateChatCard } from './cardBuilder';

const mockActivity = {
    timestamp: "1678886400000",
};
const actionType = "create";
const actorEmail = "testuser@example.com";
const fileName = "Q3 Financial Report.pdf";
const fileUrl = "https://drive.google.com/file/d/1234567890abcdef/view";

const cardMessage = generateChatCard(mockActivity, actionType, actorEmail, fileName, fileUrl);

console.log(JSON.stringify(cardMessage, null, 2));

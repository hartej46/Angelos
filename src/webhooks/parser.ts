import { MetaWebhookPayload } from "../types/internal.js";

export const parser = (jsonData: MetaWebhookPayload) => {
    try {
        const entry = jsonData?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (!message || message.type !== "text") return null;

        return {
            sendersPhoneNumber: message.from,
            text: message.text,
            messageId: message.id,
            timeStamp: message.timestamp,
        };
    } catch (error) {
        return null;
    }
};

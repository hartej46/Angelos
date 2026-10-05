import { ParsedData } from "../types/index.js";
import { MetaWebhookPayload } from "../types/internal.js";

/**
 * 
 * @param jsonData {MetaWebhookPayload} The parsed Data from post request from meta
 * @returns {ParsedData} this returns data which is contains formatted information
 * if invalid returns not data
 */
export const parser = (jsonData: MetaWebhookPayload): ParsedData => {
    try {
        const entry = jsonData?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (!message || message.type !== "text") return null;

        return {
            sendersPhoneNumber: message.from,
            text: message.text.body,
            messageId: message.id,
            timestamp: message.timestamp,
        };
    } catch (error) {
        return null;
    }
};

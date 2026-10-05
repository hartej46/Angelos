/** Text message shape returned by the WhatsApp Cloud API. */
export interface MetaWebhookTextMessage {
    from: string;
    id: string;
    timestamp: string;
    type: "text";
    text: {
        body: string;
    };
}

/** Non-text message shape; media-specific fields are preserved generically. */
export interface MetaWebhookOtherMessage {
    from: string;
    id: string;
    timestamp: string;
    type:
        "image" | "audio" | "document" | "video" | "sticker" | "button" | "interactive" | "unknown";
    [key: string]: unknown;
}

/** Union of message events supported by the webhook payload model. */
export type MetaWebhookMessage = MetaWebhookTextMessage | MetaWebhookOtherMessage;

/** Delivery status update emitted for an outbound WhatsApp message. */
export interface MetaWebhookStatus {
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
}

/**
 * Event data contained in a webhook change.
 *
 * A payload normally contains either `messages` or `statuses`, depending on
 * the event that Meta delivered.
 */
export interface MetaWebhookValue {
    messaging_product: "whatsapp";
    metadata: {
        display_phone_number: string;
        phone_number_id: string;
    };
    contacts?: {
        profile: {
            name: string;
        };
        wa_id: string;
    }[];
    messages?: MetaWebhookMessage[];
    statuses?: MetaWebhookStatus[];
}

/** A single WhatsApp change notification within an account entry. */
export interface MetaWebhookChange {
    field: "messages";
    value: MetaWebhookValue;
}

/** Account-level webhook entry containing one or more change notifications. */
export interface MetaWebhookEntry {
    id: string;
    changes: MetaWebhookChange[];
}

/** Root payload sent by Meta for WhatsApp Business Account webhooks. */
export interface MetaWebhookPayload {
    object: "whatsapp_business_account";
    entry?: MetaWebhookEntry[];
}

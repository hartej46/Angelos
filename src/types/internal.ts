export interface MetaWebhookTextMessage {
    from: string;
    id: string;
    timestamp: string;
    type: "text";
    text: {
        body: string;
    };
}

export interface MetaWebhookOtherMessage {
    from: string;
    id: string;
    timestamp: string;
    type:
        "image" | "audio" | "document" | "video" | "sticker" | "button" | "interactive" | "unknown";
    [key: string]: unknown;
}

export type MetaWebhookMessage = MetaWebhookTextMessage | MetaWebhookOtherMessage;

export interface MetaWebhookStatus {
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
}

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

export interface MetaWebhookChange {
    field: "messages";
    value: MetaWebhookValue;
}

export interface MetaWebhookEntry {
    id: string;
    changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
    object: "whatsapp_business_account";
    entry?: MetaWebhookEntry[];
}

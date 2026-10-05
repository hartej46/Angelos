import { MetaWebhookPayload } from "./internal.js";

/** Runtime configuration required to initialize the WhatsApp verifier. */
export interface Config {
    businessPhoneNumber: string;
    webhookVerifyToken: string;
    appSecret: string; 
    storage: StorageAdapter;
    defaultTtl?: number; 
    defaultTtlSeconds?: number;
}

/** Serialized session state persisted by a {@link StorageAdapter}. */
export interface StorageData {
    sessionId: string;
    expectedPhoneNumber: string;
    token: string;
    expiresAt: number;
}

/**
 * Minimal persistence contract used by the verifier.
 *
 * Implementations may be synchronous or asynchronous; `setIfAbsent` must
 * preserve atomicity so concurrent requests cannot claim the same session.
 */
export interface StorageAdapter {
    get(key: string): Promise<string | null> | string | null;

    setIfAbsent(
        key: string,
        value: string,
        expiresAt: number,
    ): Promise<boolean> | boolean;

    delete(
        key: string
    ): Promise<boolean> | boolean;
}

/** Options used when creating a new verification session. */
export interface CreateSessionConfig {
    phoneNumber: string;
    ttl?: number;
}

/** Links generated for completing a verification session. */
export interface GeneratedOrCode {
    dataLink: string;
    deepLink: string;
    qrLink: string;
    qrSvg: string;
}

/** Complete session details returned after a session is created. */
export interface CreateSessionResult extends GeneratedOrCode {
    id: string;
    token: string;
    expiresAt: number;
}

/**
 * Webhook data required for signature validation and payload parsing.
 *
 * `rawBody` must contain the original request bytes used to calculate the
 * signature; parsing and re-serializing the body can invalidate verification.
 */
export interface VerifyWebhooks {
    rawBody: Buffer;
    signature: string;
    jsonData: MetaWebhookPayload;
}

/** Normalized message fields extracted from a Meta webhook payload. */
export interface ParsedDataOutputs {
    sendersPhoneNumber: string;
    text: string;
    messageId: string;
    timestamp: string;
}

export type ParsedData = ParsedDataOutputs | null;

/** Result of a session verification attempt. */
export interface VerifySession {
    success: boolean;
    message: string;
    parsedData?: ParsedDataOutputs;
}

/** Query parameters used by Meta during webhook endpoint verification. */
export interface WebhookVerificationQuery {
    "hub.mode": string;
    "hub.verify_token": string;
    "hub.challenge": string;
}

/** Result returned after validating Meta's webhook challenge request. */
export interface WebhookVerificationResult {
    success: boolean;
    challenge?: string;
}

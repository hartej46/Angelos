import { MetaWebhookPayload } from "./internal.js";

/**
 * Types for configuration of new class
 */
export interface Config {
    businessPhoneNumber: string;
    webhookVerifyToken: string;
    appSecret: string; 
    storage: StorageAdapter;
    defaultTtl?: number; 
    defaultTtlSeconds?: number;
}

/**
 * Data stored in external driver provided by adapter
 */

export interface StorageData {
    sessionId: string;
    expectedPhoneNumber: string;
    token: string;
    expiresAt: number;
}

export interface StorageAdapter {
    get(key: string): Promise<string> | string;
    set(key: string, value: string, expiresAt: number): Promise<void> | void;
    delete(key: string): Promise<void> | void;
}

export interface CreateSessionConfig {
    phoneNumber: string;
    ttl?: number;
}

export interface GeneratedOrCode {
    dataLink: string;
    deepLink: string;
    qrLink: string;
    qrSvg: string;
}

export interface CreateSessionResult extends GeneratedOrCode {
    id: string;
    token: string;
    expiresAt: number;
}

export interface VerifyWebhooks {
    rawBody: Buffer;
    signature: string;
    jsonData: MetaWebhookPayload;
}

export interface ParsedDataOutputs {
    sendersPhoneNumber: string;
    text: string;
    messageId: string;
    timestamp: string;
}

export type ParsedData = ParsedDataOutputs | null;

export interface VerifySession {
    success: boolean;
    message: string;
    parsedData?: ParsedDataOutputs;
}

export interface WebhookVerificationQuery {
    "hub.mode": string;
    "hub.verify_token": string;
    "hub.challenge": string;
}

export interface WebhookVerificationResult {
    success: boolean;
    challenge?: string;
}

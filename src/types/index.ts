/**
 * Types for configuration of new class
 */
export interface Config {
    businessPhoneNumber: string;
    waVerificationKey: string;
    storage: any;
    defaultTtl: number;
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
    get(key: string): Promise<any> | any;
    set(key: string, value: any, expiresAt: number): Promise<void> | void;
    delete(key: string): Promise<void> | void;
}

export interface CreateSessionConfig {
    phoneNumber: string;
    ttl?: number;
}

export interface GeneratedOrCode {
    dataLink: string;
    qrLink: string;
    qrSvg: string;
}

export interface VerifyWebhooks {
    rawBody: Buffer;
    signature: string;
    jsonData: string;
}

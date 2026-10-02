import { generateQrFromData } from "./qr/qrGenerator.js";
import {
    Config,
    CreateSessionConfig,
    CreateSessionResult,
    StorageAdapter,
    StorageData,
    VerifySession,
    VerifyWebhooks,
    WebhookVerificationQuery,
    WebhookVerificationResult,
} from "./types/index.js";
import crypto from "node:crypto";
import { verifyMetaSignature } from "./webhooks/signature.js";
import { parser } from "./webhooks/parser.js";
import { generateKey } from "./keyGenerator/keyGenerator.js";

const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 3600;

class whatsappVerifier {
    private storage: StorageAdapter;
    private businessPhoneNumber: string;
    private waVerificationKey: string;
    private defaultTtl: number;

    constructor(config: Config) {
        this.storage = config.storage;
        this.businessPhoneNumber = config.businessPhoneNumber;
        this.waVerificationKey = config.waVerificationKey;
        this.defaultTtl = this.validateTtl(config.defaultTtl, "defaultTtl");
    }

    private validateTtl(ttl: number, label: string): number {
        if (!Number.isFinite(ttl) || ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
            throw new RangeError(
                `${label} must be between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS} seconds, got ${ttl}`
            );
        }
        return ttl;
    }

    public async createSession(params: CreateSessionConfig): Promise<CreateSessionResult> {
        const id = crypto.randomUUID();
        const cleanPhone = params.phoneNumber.replace(/\D/g, "");
        const ttl = params.ttl ? this.validateTtl(params.ttl, "ttl") : this.defaultTtl;
        const token = crypto.randomInt(100000, 999999).toString();
        const expiresAt = ttl * 1000 + Date.now();

        const sessionData: StorageData = {
            sessionId: id,
            expectedPhoneNumber: cleanPhone,
            token: token,
            expiresAt: expiresAt,
        };

        const key = generateKey(cleanPhone);

        try {
            await this.storage.set(key, JSON.stringify(sessionData), expiresAt);
        } catch (error:unknown) {
            throw new Error(`Failed to store session data: ${error instanceof Error ? error.message : error}`);
        }

        const message = `VERIFY ${id} ${token} ${expiresAt}`;
        const { dataLink, deepLink, qrLink, qrSvg } = await generateQrFromData(
            this.businessPhoneNumber,
            message,
        );

        return {
            id,
            token,
            dataLink,
            deepLink,
            qrLink,
            qrSvg,
        };
    }

    public async verifySession(params: VerifyWebhooks): Promise<VerifySession> {
        const rawBody = params.rawBody;
        const jsonData = params.jsonData;
        const signature = params.signature;

        const isSignatureValid = verifyMetaSignature(rawBody, signature, this.waVerificationKey);
        if (!isSignatureValid) {
            return {
                success: false,
                message: "Invalid webhook signature",
            };
        }

        const parsedData = parser(jsonData);
        if (!parsedData) {
            return {
                success: false,
                message: "Invalid or unsupported webhook message",
            };
        }

        const key = generateKey(parsedData.sendersPhoneNumber.replace(/\D/g, ""));
        let userData;

        try {
            const data = await this.storage.get(key);
            if (!data) {
                return {
                    success: false,
                    message: "Session data not found",
                };
            }

            userData = JSON.parse(data) as StorageData;
            await this.storage.delete(key);
        } catch (error: unknown) {
            return {
                success: false,
                message: `Failed to get/delete session data: ${error instanceof Error ? error.message : error}`,
            };
        }

        const messageKeyword = parsedData.text.trim().split(' ');
        const id = messageKeyword[1];
        const token = messageKeyword[2];
        const expiresAt = messageKeyword[3];

        const tokenBuffer = Buffer.from(token ?? "", "utf8");
        const expectedTokenBuffer = Buffer.from(userData.token, "utf8");

        const senderPhone = parsedData.sendersPhoneNumber.replace(/\D/g, "");
        const phoneBuffer = Buffer.from(senderPhone, "utf8");
        const expectedPhoneBuffer = Buffer.from(userData.expectedPhoneNumber, "utf8");

        const isTokenValid =
            tokenBuffer.length === expectedTokenBuffer.length &&
            crypto.timingSafeEqual(tokenBuffer, expectedTokenBuffer);

        const isPhoneValid =
            phoneBuffer.length === expectedPhoneBuffer.length &&
            crypto.timingSafeEqual(phoneBuffer, expectedPhoneBuffer);

        if (!isTokenValid || !isPhoneValid || Number(expiresAt) < Date.now()) {
            return {
                success: false,
                message: "Token is invalid or expired"
            }
        }

        return {
            success: true,
            message: "Successfully parsed the data",
            parsedData: parsedData
        }
    }

    public handleWebhookVerification(query: WebhookVerificationQuery): WebhookVerificationResult {
        const mode = query["hub.mode"];
        const token = query["hub.verify_token"];
        const challenge = query["hub.challenge"];

        if (mode === "subscribe" && token === this.waVerificationKey) {
            return { success: true, challenge };
        }

        return { success: false };
    }
}

export default whatsappVerifier;
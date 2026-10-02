import crypto from "node:crypto";

export const verifyMetaSignature = (
    rawPayload: Buffer,
    signatureHeader: string,
    secretKey: string,
) => {
    if (!rawPayload || !signatureHeader || !secretKey) return false;

    const [algorithm, signature] = signatureHeader.split("=");

    const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(rawPayload)
        .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

import crypto from "node:crypto";

export const verifyMetaSignature = (
    rawPayload: Buffer,
    signatureHeader: string,
    secretKey: string,
) => {
    if (!rawPayload || !signatureHeader || !secretKey) return false;

    const [algorithm, signature] = signatureHeader.split("=");

    if (!algorithm || algorithm != 'sha256') return false;

    const expectedSignature = crypto
        .createHmac(algorithm, secretKey)
        .update(rawPayload)
        .digest("hex");

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

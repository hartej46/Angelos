import crypto from "node:crypto";

/**
 * Verifies a Meta webhook signature against the exact request payload.
 *
 * The payload must be validated before parsing or re-serializing it, because
 * even semantically equivalent JSON can produce a different HMAC.
 */
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

    // Compare equal-length buffers with a constant-time operation to reduce
    // the risk of leaking signature information through timing differences.
    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

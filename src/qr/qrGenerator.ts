import QRCode from "qrcode";
import { GeneratedOrCode } from "../types/index.js";

/**
 * Builds WhatsApp links and renders the same payload as both a data URL and SVG.
 * Encoding the message once keeps the browser and native-app links consistent.
 */
export const generateQrFromData = async (
    phoneNumber: string,
    token: string,
): Promise<GeneratedOrCode> => {
    const encodedText = encodeURIComponent(token);

    // The web link is suitable for browser-based clients, while the deep link
    // allows supported devices to hand the action directly to WhatsApp.
    const dataLink = `https://wa.me/${phoneNumber}?text=${encodedText}`;
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedText}`;

    // Generate both formats from the same web URL so every QR representation
    // resolves to identical, predictable behavior.
    const qrLink = await QRCode.toDataURL(dataLink, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
    });

    const qrSvg = await QRCode.toString(dataLink, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: "M",
    });

    return {
        dataLink: dataLink,
        deepLink: deepLink,
        qrLink: qrLink,
        qrSvg: qrSvg,
    } as GeneratedOrCode;
};

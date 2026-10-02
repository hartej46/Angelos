import QRCode from "qrcode";
import { GeneratedOrCode } from "../types/index.js";

export const generateQrFromData = async (
    phoneNumber: string,
    token: string,
): Promise<GeneratedOrCode> => {
    const encodedText = encodeURIComponent(token);
    const dataLink = `https://wa.me/${phoneNumber}?text=${encodedText}`;
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedText}`;

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
import QRCode from "qrcode";
import { GeneratedOrCode } from "../types/index.js";

export const generateQrFromData = async (
    phoneNumber: string,
    token: string,
): Promise<GeneratedOrCode> => {
    const dataLink = `https://wa.me/${phoneNumber}?text=${token}`;

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
        qrLink: qrLink,
        qrSvg: qrSvg,
    } as GeneratedOrCode;
};
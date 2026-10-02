export function generateKey(phoneNumber: string): string {
    return `wa_verify:${phoneNumber}`;
}

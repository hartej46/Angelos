# angelos

WhatsApp QR-code and deep-link phone verification for Node.js.

`angelos` creates short-lived verification sessions, generates a WhatsApp
message containing the session details, and verifies the message received from
the WhatsApp Cloud API. It validates Meta webhook signatures, compares the
sender and token in constant time, and deletes a successful session to prevent
replay.

> This package does not send messages through the WhatsApp API. The user sends
> the generated pre-filled message to your WhatsApp Business number.

## Requirements

- Node.js 18 or newer
- A WhatsApp Business number connected to the Meta Cloud API
- A persistent `StorageAdapter` implementation
- A publicly reachable HTTPS webhook URL in production

## Installation

```bash
npm install angelos
```

The package provides both ESM and CommonJS builds and includes TypeScript
declarations.

## How it works

```text
Your application                 User's WhatsApp             Meta Cloud API
      |                                  |                          |
      | createSession(phone)             |                          |
      |--------------------------------->|                          |
      |  QR code + WhatsApp links        |                          |
      |<---------------------------------|                          |
      |                                  | send VERIFY message      |
      |                                  |------------------------->|
      |                                  |                          |
      |                 POST webhook (signed with App Secret)        |
      |<-------------------------------------------------------------|
      | verifySession(raw body, signature, parsed JSON)              |
      | compares phone/token and deletes the session                |
```

The generated message has this format:

```text
VERIFY <session-id> <six-digit-token> <expiry-time>
```

## Quick start

`WhatsAppOtpVerifier` is the package's default export:

```ts
import WhatsAppOtpVerifier from "angelos";

const verifier = new WhatsAppOtpVerifier({
  businessPhoneNumber: process.env.WHATSAPP_BUSINESS_NUMBER!,
  webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN!,
  appSecret: process.env.META_APP_SECRET!,
  storage: yourStorageAdapter,
  defaultTtlSeconds: 180,
});
```

Pass the WhatsApp Business number registered with Meta, normally without the
leading `+`. Phone numbers supplied to `createSession` are normalized by
removing non-digit characters before they are stored and compared.

### Create a session

```ts
const session = await verifier.createSession({
  phoneNumber: "919876543210",
  ttl: 180, // optional; seconds
});

console.log(session.id);
console.log(session.dataLink); // https://wa.me/... link
console.log(session.deepLink); // whatsapp://send?... link
console.log(session.qrLink);   // QR code as a data URL
console.log(session.qrSvg);    // QR code as an SVG string
console.log(session.expiresAt); // Unix timestamp in milliseconds
```

Display `qrLink` in an image, render `qrSvg`, or offer `dataLink` and
`deepLink` as links. The returned `token` is included for application
workflows that need to display or retain it; treat it as a secret.

Only one active session is allowed for a normalized phone number. The storage
adapter's `setIfAbsent` operation must be atomic.

### Verify a webhook message

Meta requires the original request bytes for HMAC verification. Capture the
raw body before JSON parsing and pass it unchanged to `verifySession`:

```ts
const result = await verifier.verifySession({
  rawBody, // Buffer containing the exact HTTP request body
  signature: req.headers["x-hub-signature-256"] as string,
  jsonData: req.body,
});

if (result.success) {
  const phoneNumber = result.parsedData.sendersPhoneNumber;
  // Mark the application user/session for phoneNumber as verified.
} else {
  console.error(result.message);
}
```

`verifySession` accepts text-message webhook events. It returns
`success: false` for an invalid signature, unsupported payload, missing
session, invalid token/phone/expiry, or a failed session deletion.

### Handle Meta's webhook verification request

When configuring the callback URL in Meta, forward the query parameters to
`handleWebhookVerification`:

```ts
const result = verifier.handleWebhookVerification({
  "hub.mode": String(req.query["hub.mode"] ?? ""),
  "hub.verify_token": String(req.query["hub.verify_token"] ?? ""),
  "hub.challenge": String(req.query["hub.challenge"] ?? ""),
});

if (result.success) {
  res.status(200).send(result.challenge);
} else {
  res.sendStatus(403);
}
```

## Express integration

The JSON parser must preserve the raw request body used to calculate Meta's
`X-Hub-Signature-256` header:

```ts
import express from "express";
import WhatsAppOtpVerifier from "angelos";

const app = express();

app.use(
  express.json({
    verify: (request, _response, buffer) => {
      (request as express.Request & { rawBody?: Buffer }).rawBody = buffer;
    },
  }),
);

app.post("/webhooks/whatsapp", async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  const signature = req.header("x-hub-signature-256");

  if (!rawBody || !signature) {
    return res.sendStatus(400);
  }

  // Acknowledge Meta promptly, then update application state.
  res.status(200).send("EVENT_RECEIVED");

  const result = await verifier.verifySession({
    rawBody,
    signature,
    jsonData: req.body,
  });

  if (result.success) {
    // Match result.parsedData.sendersPhoneNumber to your own login session.
  } else {
    console.error(result.message);
  }
});
```

The `verifier` in this example is initialized as shown in the
[Quick start](#quick-start). Your application is responsible for mapping the
verified phone number to a user or login flow; `angelos` does not provide an
HTTP status or polling endpoint.

## Storage adapter

`angelos` deliberately does not include an in-memory or database adapter.
Provide an implementation with `get`, atomic `setIfAbsent`, and `delete`
methods:

```ts
import type { StorageAdapter } from "angelos";

const storage: StorageAdapter = {
  async get(key) {
    return redis.get(key);
  },

  async setIfAbsent(key, value, expiresInSeconds) {
    const result = await redis.set(key, value, {
      NX: true,
      EX: expiresInSeconds,
    });
    return result === "OK";
  },

  async delete(key) {
    return (await redis.del(key)) > 0;
  },
};
```

The `expiresAt` argument to `setIfAbsent` is a duration in seconds, despite
the historical parameter name in the TypeScript interface. The serialized
value has this shape:

```ts
interface StorageData {
  sessionId: string;
  expectedPhoneNumber: string;
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
}
```

## API reference

### `new WhatsAppOtpVerifier(config)`

`Config` contains:

| Property | Type | Description |
| --- | --- | --- |
| `businessPhoneNumber` | `string` | WhatsApp Business number used in generated links. |
| `webhookVerifyToken` | `string` | Token configured in Meta for the GET webhook handshake. |
| `appSecret` | `string` | Meta App Secret used to verify `X-Hub-Signature-256`. |
| `storage` | `StorageAdapter` | Session persistence implementation. |
| `defaultTtl` | `number` | Optional default session lifetime in seconds. |
| `defaultTtlSeconds` | `number` | Alias for `defaultTtl`. |

The default TTL is 180 seconds. TTL values must be between 30 and 3600 seconds
inclusive; invalid values throw `RangeError`. If both TTL configuration names
are supplied, `defaultTtl` takes precedence.

### `createSession(params)`

`params` contains `phoneNumber` and an optional `ttl` in seconds. It returns a
`CreateSessionResult` with `id`, `token`, `dataLink`, `deepLink`, `qrLink`,
`qrSvg`, and `expiresAt`.

### `verifySession(params)`

`params` contains the original `rawBody` (`Buffer`), the
`x-hub-signature-256` header value (`signature`), and parsed Meta webhook
`jsonData`. It returns `VerifySession`:

- `{ success: true, message, parsedData }` after a valid message and successful
  session deletion.
- `{ success: false, message }` when validation or storage operations fail.

### `handleWebhookVerification(query)`

Validates Meta's `hub.mode`, `hub.verify_token`, and `hub.challenge` query
parameters. It returns `{ success: true, challenge }` for a valid handshake or
`{ success: false }` otherwise.

## Security and production notes

- Keep the Meta App Secret and webhook verify token in environment variables.
- Always verify the raw body before trusting webhook data.
- Use a shared persistent store such as Redis for multiple application
  instances; do not use a process-local map in production.
- Serve the webhook over HTTPS and acknowledge Meta quickly.
- Treat returned tokens and generated links as sensitive, short-lived values.
- Rate-limit session creation and webhook processing in your application.

## Development

```bash
npm run typecheck
npm run build
```

The build emits ESM, CommonJS, and declaration files into `dist/`.

## License

MIT

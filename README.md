#Angelos

Zero-cost, inbound WhatsApp OTP authentication for Node.js.

Instead of paying for outbound SMS gateways or paid Meta template conversations, verify users by letting them send a pre-filled WhatsApp message back to your Meta Business number. The package handles QR code generation, deep-links, Meta Cloud API webhook signature verification, and replay-protected token comparison.

---

## Architecture Overview

```text
User Browser                       Your Server                    Meta Cloud API
     |                                  |                               |
     |--- 1. POST /auth/init ---------->|                               |
     |    (phone: "919876543210")       |                               |
     |                                  |--- 2. createSession() --------|
     |<-- 3. Returns QR & Deep Link ----|    (stores OTP in memory/DB)  |
     |                                                                  |
     |==== 4. User sends "VERIFY <UUID> <OTP>" via WhatsApp ===========>|
     |                                                                  |
     |                                  |<-- 5. POST /webhook ----------|
     |                                  |    (signed with App Secret)   |
     |                                  |                               |
     |                                  |--- 6. verifyWebhook() --------|
     |                                  |    - checks signature         |
     |                                  |    - compares sender phone    |
     |                                  |    - drops token from store   |
     |<-- 7. Poll or SSE detects match -|                               |
```

## Installation

```bash
npm install angelos
```
Requires Node.js 18.0.0 or higher.

## Meta Dashboard Setup

1. Go to [developers.facebook.com](https://developers.facebook.com/) and create or open your Business App.
2. Under **WhatsApp > Configuration**:
   - **Callback URL:** `https://yourdomain.com/api/webhook/whatsapp` (use ngrok for local testing).
   - **Verify Token:** Any custom string you choose (e.g. `MY_SECRET_HANDSHAKE_TOKEN`).
   - Subscribe to the `messages` webhook field.
3. Under **App settings > Basic**:
   - Copy your **App Secret** to verify incoming request signatures.
4. Copy your registered **WhatsApp Business Phone Number** (in E.164 format without `+`).

## Usage Example (Express.js)

### 1. Initialize the Verifier

```ts
// src/verifier.ts
import { WhatsAppOtpVerifier } from "@wa-auth/verifier";

export const verifier = new WhatsAppOtpVerifier({
  businessPhoneNumber: process.env.WHATSAPP_PHONE_NUMBER!,
  webhookVerifyToken: process.env.META_VERIFY_TOKEN!,
  appSecret: process.env.META_APP_SECRET, // Validates X-Hub-Signature-256
  defaultTtlSeconds: 180, // 3‑minute validity
});
```

### 2. Configure Raw Body Parsing (Required for Signature Verification)
Meta signs every incoming POST webhook using HMAC‑SHA256 based on the raw payload bytes. Capture the unparsed buffer in Express:

```ts
// src/server.ts
import express from "express";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use("/api", authRoutes);

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

### 3. Setup Routes and Controllers

```ts
// src/routes/auth.routes.ts
import { Router, Request, Response } from "express";
import { verifier } from "../verifier.js";

const router = Router();

// In‑memory lookup for verified states (use DB or Redis in production)
const verifiedSessions = new Set<string>();

/**
 * 1. Client requests authentication targets
 */
router.post("/auth/init", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Missing phone number" });
    }

    const session = await verifier.createSession({
      phoneNumber: phone,
      ttl: 180,
    });

    return res.status(200).json({
      sessionId: session.id,
      qrCode: session.qrLink, // Data URL for <img> tags
      deepLink: session.deepLink, // wa.me link
      appLink: session.qrLink, // whatsapp:// link (same as qrLink here)
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Meta Webhook Handshake (GET)
 */
router.get("/webhook/whatsapp", (req: Request, res: Response) => {
  const challenge = verifier.handleWebhookVerification(req.query);
  if (challenge) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * 3. Meta Webhook Ingestion (POST)
 */
router.post("/webhook/whatsapp", async (req: Request, res: Response) => {
  // Acknowledge Meta immediately with 200 OK
  res.status(200).send("EVENT_RECEIVED");

  try {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const rawBuffer = (req as any).rawBody;

    const result = await verifier.verifySession({
      rawBody: rawBuffer,
      signature,
      jsonData: req.body,
    });

    if (result.success && result.parsedData?.sendersPhoneNumber) {
      verifiedSessions.add(result.parsedData?.sendersPhoneNumber);
      console.log(`Phone +${result.parsedData.sendersPhoneNumber} verified.`);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

/**
 * 4. Client polls this endpoint to verify completion
 */
router.get("/auth/status", (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  const isVerified = verifiedSessions.has(sessionId);
  return res.status(200).json({
    status: isVerified ? "VERIFIED" : "PENDING",
  });
});

export default router;
```

## API Reference

### `new WhatsAppOtpVerifier(config)`

Creates a verifier instance bound to a specific Meta WhatsApp Business number.

**Parameters** (`config: Config`):
- `businessPhoneNumber: string` – Your registered WhatsApp Business phone number in **E.164** format (e.g. `"15550616140"` or `"+15550616140"`).
- `webhookVerifyToken: string` – Token you set in the Meta App dashboard; used for the GET verification challenge during webhook registration.
- `appSecret?: string` – **Optional** Meta App Secret. When provided the verifier will validate the `X‑Hub‑Signature‑256` header on incoming webhook POSTs.
- `storage?: StorageAdapter` –  key‑value store used to keep OTP sessions. For production you should supply a Redis, DynamoDB, etc. implementation that matches the `StorageAdapter` interface.
- `defaultTtlSeconds?: number` – **Optional** default time‑to‑live for OTP sessions (seconds). Defaults to `180` (3 minutes) if not supplied.

The constructor validates the TTL values and will throw a `RangeError` if they fall outside the allowed range (30 – 3600 seconds).

**Returns** an instance of `WhatsAppOtpVerifier` ready to be used with the methods described below.


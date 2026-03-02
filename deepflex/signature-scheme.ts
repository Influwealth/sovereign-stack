import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignableSAPEnvelope {
  sap_version: string;
  message_id: string;
  from: string;
  to: string;
  capability_id: string;
  intent: string;
  payload?: unknown;
  financial_intent?: unknown;
}

export interface SignatureDecision {
  valid: boolean;
  reason?: string;
  expected?: string;
}

export interface SignatureScheme {
  schemeId: string;
  sign(subject: string, envelope: SignableSAPEnvelope): string;
  verify(subject: string, envelope: SignableSAPEnvelope, signature: string): SignatureDecision;
}

interface HmacSignatureSchemeOptions {
  key?: string;
}

function canonicalizeEnvelope(envelope: SignableSAPEnvelope): string {
  return JSON.stringify(
    {
      sap_version: envelope.sap_version,
      message_id: envelope.message_id,
      from: envelope.from,
      to: envelope.to,
      capability_id: envelope.capability_id,
      intent: envelope.intent,
      payload: envelope.payload ?? null,
      financial_intent: envelope.financial_intent ?? null
    },
    null,
    0
  );
}

export class HmacSignatureScheme implements SignatureScheme {
  readonly schemeId = "sap-hmac-sha256-v1";
  private readonly key: string;

  constructor(options: HmacSignatureSchemeOptions = {}) {
    this.key = options.key ?? process.env.DEEPFLEX_SAP_SIGNING_KEY ?? "deepflex-local-dev-key";
  }

  sign(subject: string, envelope: SignableSAPEnvelope): string {
    const canonical = canonicalizeEnvelope(envelope);
    const digest = createHmac("sha256", this.key)
      .update(`${subject}:${canonical}`, "utf8")
      .digest("hex");
    return `${this.schemeId}:${digest}`;
  }

  verify(subject: string, envelope: SignableSAPEnvelope, signature: string): SignatureDecision {
    if (!signature || typeof signature !== "string") {
      return { valid: false, reason: "Missing signature." };
    }

    const expected = this.sign(subject, envelope);
    const valid = safeEqual(expected, signature);
    if (!valid) {
      return {
        valid: false,
        reason: "Signature mismatch.",
        expected
      };
    }

    return { valid: true };
  }
}

function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  return timingSafeEqual(leftBytes, rightBytes);
}

export function createRuntimeSignatureScheme(options: HmacSignatureSchemeOptions = {}): SignatureScheme {
  return new HmacSignatureScheme(options);
}

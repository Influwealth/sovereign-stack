import { createLocalSignature, type RuntimeSubsystem } from "./runtime-core";

export interface IdentityRecord {
  subsystemId: string;
  did: string;
  status: "active" | "disabled";
}

export interface IdentitySubsystemOptions {
  records?: IdentityRecord[];
  resolveIdentity?: (subsystemId: string) => IdentityRecord | null;
  verifySignature?: (input: {
    subject: string;
    signature: string;
    message_id: string;
    envelope?: unknown;
  }) => {
    valid: boolean;
    reason?: string;
    expected?: string;
  };
}

interface VerifySignaturePayload {
  subject?: string;
  signature?: string;
  message_id?: string;
  envelope?: unknown;
}

interface ResolveIdentityPayload {
  subject?: string;
  subsystemId?: string;
}

export function createIdentitySubsystem(options: IdentitySubsystemOptions = {}): RuntimeSubsystem {
  const records = new Map<string, IdentityRecord>();

  for (const record of options.records ?? []) {
    records.set(record.subsystemId, record);
  }

  const resolveIdentity = (subsystemId: string): IdentityRecord | null => {
    const local = records.get(subsystemId);
    if (local) {
      return local;
    }
    return options.resolveIdentity?.(subsystemId) ?? null;
  };

  return {
    identity: {
      subsystemId: "identity",
      did: "did:deepflex:identity",
      capabilities: ["identity.resolve", "identity.authorize", "sap.signature.verify"]
    },
    accepts: ["identity.resolve", "identity.authorize", "identity.verify_signature", "query_state"],
    handle: async (message) => {
      if (message.intent === "identity.verify_signature") {
        const payload = (message.payload ?? {}) as VerifySignaturePayload;
        const subject = String(payload.subject ?? "").trim();
        const signature = String(payload.signature ?? "").trim();
        const messageId = String(payload.message_id ?? "").trim();
        const envelope = payload.envelope;

        if (!subject) {
          return { valid: false, reason: "Missing subject for signature verification." };
        }
        if (!messageId) {
          return { valid: false, reason: "Missing message_id for signature verification." };
        }

        const record = resolveIdentity(subject);
        if (!record) {
          return { valid: false, reason: `Unknown identity '${subject}'.` };
        }
        if (record.status !== "active") {
          return { valid: false, reason: `Identity '${subject}' is not active.` };
        }

        const callbackDecision = options.verifySignature?.({
          subject,
          signature,
          message_id: messageId,
          envelope
        });

        if (callbackDecision && !callbackDecision.valid) {
          return {
            valid: false,
            reason: callbackDecision.reason ?? `Signature mismatch for '${subject}'.`,
            expected: callbackDecision.expected
          };
        }

        if (!callbackDecision) {
          const expected = createLocalSignature(subject, messageId);
          if (signature !== expected) {
            return {
              valid: false,
              reason: `Signature mismatch for '${subject}'.`,
              expected
            };
          };
        }

        return {
          valid: true,
          subject,
          did: record.did
        };
      }

      if (message.intent === "identity.resolve" || message.intent === "query_state") {
        const payload = (message.payload ?? {}) as ResolveIdentityPayload;
        const subject = String(payload.subject ?? payload.subsystemId ?? "").trim();
        if (!subject) {
          return { found: false, reason: "No identity subject was provided." };
        }
        const record = resolveIdentity(subject);
        if (!record) {
          return { found: false, reason: `Identity '${subject}' was not found.` };
        }

        return {
          found: true,
          subsystemId: record.subsystemId,
          did: record.did,
          status: record.status
        };
      }

      if (message.intent === "identity.authorize") {
        return {
          allowed: true,
          mode: "stub",
          reason: "Identity authorization stub accepted."
        };
      }

      return {
        ok: false,
        error: `Identity subsystem does not handle intent '${message.intent}'.`
      };
    }
  };
}

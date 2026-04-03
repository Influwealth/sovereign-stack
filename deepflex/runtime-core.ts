import { RuntimeEventBus } from "./event-bus";
import { FinancialSettlementStub, type SettlementEvaluation } from "./financial-settlement";
import { MeshRegistry } from "./mesh-registration";
import { createRuntimeSignatureScheme, type SignableSAPEnvelope, type SignatureScheme } from "./signature-scheme";

export type SAPVersion = "1.0";

export interface FinancialIntent {
  budget?: number;
  currency?: string;
  max_spend?: number;
  sponsor?: string;
  settlement_model?: string;
  estimated_cost?: number;
}

export interface FinancialIntentDecision {
  allow: boolean;
  reason: string;
  estimated_cost: number;
  max_spend?: number;
  reservation_id?: string;
  settlement_model?: string;
  currency?: string;
  status: "reserved" | "settled" | "rejected";
}

export interface SAPMessage<TPayload = unknown> {
  sap_version: SAPVersion;
  message_id: string;
  from: string;
  to: string;
  capability_id: string;
  intent: string;
  signature: string;
  payload?: TPayload;
  financial_intent?: FinancialIntent;
}

export interface RuntimeSubsystemIdentity {
  subsystemId: string;
  did: string;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeSubsystem {
  identity: RuntimeSubsystemIdentity;
  accepts: string[];
  handle: (message: SAPMessage, context: RuntimeDispatchContext) => Promise<unknown> | unknown;
}

export interface RuntimeDispatchContext {
  runtime: DeepFlexRuntimeCore;
}

export interface SAPDispatchResult {
  ok: boolean;
  message_id: string;
  from: string;
  to: string;
  intent: string;
  capability_id: string;
  financial_decision: FinancialIntentDecision;
  result: unknown;
}

export interface RuntimeCoreOptions {
  identitySubsystemId?: string;
  eventBus?: RuntimeEventBus;
  meshRegistry?: MeshRegistry;
  signatureScheme?: SignatureScheme;
  settlementStub?: FinancialSettlementStub;
  requireIdentityVerification?: boolean;
  loggerHook?: RuntimeLoggerHook;
  supervisorHook?: RuntimeSupervisorHook;
}

export type RuntimeLoggerHook = (event: string, detail?: Record<string, unknown>) => void;

export type RuntimeSupervisorHook = (input: {
  agentId: string;
  event: string;
  detail?: Record<string, unknown>;
  ts: string;
}) => Promise<void> | void;

interface DispatchOptions {
  skipIdentityVerification?: boolean;
  skipReplayProtection?: boolean;
}

const SUPPORTED_SAP_VERSIONS = new Set<SAPVersion>(["1.0"]);

export function createLocalSignature(subject: string, messageId: string): string {
  return `sig:${subject}:${messageId}`;
}

export function evaluateFinancialIntentStub(financialIntent?: FinancialIntent): FinancialIntentDecision {
  const estimatedCost =
    typeof financialIntent?.estimated_cost === "number"
      ? financialIntent.estimated_cost
      : typeof financialIntent?.budget === "number"
        ? financialIntent.budget
        : 0;

  const maxSpend =
    typeof financialIntent?.max_spend === "number" ? financialIntent.max_spend : Number.POSITIVE_INFINITY;

  if (estimatedCost > maxSpend) {
    return {
      allow: false,
      reason: `FinancialIntent blocked: estimated_cost ${estimatedCost} exceeds max_spend ${maxSpend}.`,
      estimated_cost: estimatedCost,
      max_spend: financialIntent?.max_spend,
      status: "rejected"
    };
  }

  return {
    allow: true,
    reason: "FinancialIntent stub accepted.",
    estimated_cost: estimatedCost,
    max_spend: financialIntent?.max_spend,
    settlement_model: financialIntent?.settlement_model,
    currency: financialIntent?.currency,
    status: financialIntent ? "reserved" : "settled"
  };
}

export class DeepFlexRuntimeCore {
  private readonly subsystems = new Map<string, RuntimeSubsystem>();
  private readonly processedMessageIds = new Set<string>();
  private readonly identitySubsystemId: string;
  private readonly eventBus: RuntimeEventBus;
  private readonly meshRegistry: MeshRegistry;
  private readonly signatureScheme: SignatureScheme;
  private readonly settlementStub: FinancialSettlementStub;
  private readonly requireIdentityVerification: boolean;
  private readonly loggerHook?: RuntimeLoggerHook;
  private supervisorHook?: RuntimeSupervisorHook;
  private messageSequence = 0;

  constructor(options: RuntimeCoreOptions = {}) {
    this.identitySubsystemId = options.identitySubsystemId ?? "identity";
    this.eventBus = options.eventBus ?? new RuntimeEventBus();
    this.signatureScheme = options.signatureScheme ?? createRuntimeSignatureScheme();
    this.settlementStub = options.settlementStub ?? new FinancialSettlementStub();
    this.meshRegistry =
      options.meshRegistry ??
      new MeshRegistry({
        eventBus: this.eventBus
      });
    this.requireIdentityVerification = options.requireIdentityVerification ?? true;
    this.loggerHook = options.loggerHook;
    this.supervisorHook = options.supervisorHook;

    this.registerSubsystem({
      identity: {
        subsystemId: "runtime-core",
        did: "did:deepflex:runtime-core",
        capabilities: ["sap.signature.verify"]
      },
      accepts: [],
      handle: async () => {
        throw new Error("runtime-core is infrastructure-only and cannot receive external SAP intents.");
      }
    });
  }

  registerSubsystem(subsystem: RuntimeSubsystem): void {
    const subsystemId = (subsystem.identity.subsystemId || "").trim();
    if (!subsystemId) {
      throw new Error("Subsystem identity.subsystemId is required.");
    }

    if (!subsystem.identity.did || !subsystem.identity.did.trim()) {
      throw new Error(`Subsystem '${subsystemId}' must define a DID.`);
    }

    if (!Array.isArray(subsystem.identity.capabilities) || subsystem.identity.capabilities.length === 0) {
      throw new Error(`Subsystem '${subsystemId}' must declare at least one capability.`);
    }

    if (this.subsystems.has(subsystemId)) {
      throw new Error(`Subsystem '${subsystemId}' is already registered.`);
    }

    this.subsystems.set(subsystemId, subsystem);
    this.meshRegistry.register({
      subsystemId,
      did: subsystem.identity.did,
      status: "registered"
    });

    this.eventBus.publish({
      type: "runtime.subsystem.registered",
      source: "runtime-core",
      correlation_id: subsystemId,
      payload: subsystem.identity
    });
    this.logRuntimeEvent("runtime.subsystem.registered", {
      subsystemId,
      did: subsystem.identity.did
    });
  }

  hasSubsystem(subsystemId: string): boolean {
    return this.subsystems.has(subsystemId);
  }

  listSubsystems(): RuntimeSubsystemIdentity[] {
    return [...this.subsystems.values()].map((subsystem) => subsystem.identity);
  }

  getEventBus(): RuntimeEventBus {
    return this.eventBus;
  }

  getMeshRegistry(): MeshRegistry {
    return this.meshRegistry;
  }

  getSettlementStub(): FinancialSettlementStub {
    return this.settlementStub;
  }

  registerExternalNode(input: {
    subsystemId: string;
    did: string;
    endpoint?: string;
    zone?: string;
    version?: string;
    status?: "registered" | "healthy" | "degraded" | "offline";
  }): void {
    if (this.meshRegistry.isRegistered(input.subsystemId)) {
      this.meshRegistry.setStatus(input.subsystemId, input.status ?? "registered");
      return;
    }

    this.meshRegistry.register(input);
  }

  updateExternalNodeHealth(
    subsystemId: string,
    status: "registered" | "healthy" | "degraded" | "offline",
    detail?: string
  ): void {
    if (!this.meshRegistry.isRegistered(subsystemId)) {
      return;
    }

    this.meshRegistry.setStatus(subsystemId, status, detail);
  }

  getMeshHealthSnapshot() {
    return this.meshRegistry.list();
  }

  setSupervisorHook(hook: RuntimeSupervisorHook): void {
    this.supervisorHook = hook;
  }

  async notifySupervisor(agentId: string, event: string, detail?: Record<string, unknown>): Promise<void> {
    if (!this.supervisorHook) {
      return;
    }

    await this.supervisorHook({
      agentId,
      event,
      detail,
      ts: new Date().toISOString()
    });
  }

  logRuntimeEvent(event: string, detail?: Record<string, unknown>): void {
    this.loggerHook?.(event, detail);
  }

  createMessageId(prefix = "sap"): string {
    this.messageSequence += 1;
    return `${prefix}-${Date.now()}-${this.messageSequence}`;
  }

  signMessage(subject: string, envelope: Omit<SAPMessage, "signature">): string {
    return this.signatureScheme.sign(subject, this.toSignableEnvelope(envelope));
  }

  verifyMessageSignature(
    subject: string,
    envelope: Omit<SAPMessage, "signature"> | SAPMessage,
    signature: string
  ): { valid: boolean; reason?: string; expected?: string } {
    return this.signatureScheme.verify(subject, this.toSignableEnvelope(envelope), signature);
  }

  async dispatch<TPayload = unknown>(message: SAPMessage<TPayload>): Promise<SAPDispatchResult> {
    this.eventBus.publish({
      type: "sap.dispatch.received",
      source: "runtime-core",
      correlation_id: message.message_id,
      payload: {
        from: message.from,
        to: message.to,
        intent: message.intent,
        capability_id: message.capability_id
      }
    });
    this.logRuntimeEvent("sap.dispatch.received", {
      messageId: message.message_id,
      from: message.from,
      to: message.to,
      intent: message.intent
    });

    return this.dispatchInternal(message, {});
  }

  private async dispatchInternal<TPayload = unknown>(
    message: SAPMessage<TPayload>,
    options: DispatchOptions
  ): Promise<SAPDispatchResult> {
    try {
      this.enforceRequiredFields(message);
      this.enforceSAPVersion(message.sap_version);

      if (!options.skipReplayProtection) {
        this.enforceReplayProtection(message.message_id);
      }

      this.enforceSignature(message);

      const sender = this.getSubsystem(message.from);
      const target = this.getSubsystem(message.to);

      this.enforceSenderCapability(sender.identity.capabilities, message.capability_id);

      if (!target.accepts.includes(message.intent)) {
        throw new Error(`Target subsystem '${message.to}' does not accept SAP intent '${message.intent}'.`);
      }

      const settlement = this.settlementStub.evaluate(message.financial_intent, {
        message_id: message.message_id,
        from: message.from,
        to: message.to,
        capability_id: message.capability_id,
        intent: message.intent
      });

      if (!settlement.allow) {
        throw new Error(settlement.reason);
      }

      if (this.requireIdentityVerification && !options.skipIdentityVerification) {
        await this.enforceIdentityVerification(message);
      }

      const result = await target.handle(message, { runtime: this });
      const financialDecision = this.mapSettlementDecision(settlement);

      this.eventBus.publish({
        type: "sap.dispatch.completed",
        source: "runtime-core",
        correlation_id: message.message_id,
        payload: {
          from: message.from,
          to: message.to,
          intent: message.intent,
          capability_id: message.capability_id,
          financial: financialDecision
        }
      });
      this.logRuntimeEvent("sap.dispatch.completed", {
        messageId: message.message_id,
        to: message.to,
        intent: message.intent
      });

      return {
        ok: true,
        message_id: message.message_id,
        from: message.from,
        to: message.to,
        intent: message.intent,
        capability_id: message.capability_id,
        financial_decision: financialDecision,
        result
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      err.message = `[sap:${message.message_id}] ${err.message}`;
      this.eventBus.publish({
        type: "sap.dispatch.failed",
        source: "runtime-core",
        correlation_id: message.message_id,
        payload: {
          error: err.message,
          from: message.from,
          to: message.to,
          intent: message.intent
        }
      });
      this.logRuntimeEvent("sap.dispatch.failed", {
        messageId: message.message_id,
        to: message.to,
        intent: message.intent,
        error: err.message
      });
      throw err;
    }
  }

  private async enforceIdentityVerification(message: SAPMessage): Promise<void> {
    if (message.from === this.identitySubsystemId) {
      return;
    }

    if (!this.subsystems.has(this.identitySubsystemId)) {
      throw new Error(
        `Identity subsystem '${this.identitySubsystemId}' is not registered. SAP signature checks are required.`
      );
    }

    const verificationMessageId = `${message.message_id}:identity-check`;
    const unsignedEnvelope: Omit<SAPMessage, "signature"> = {
      sap_version: "1.0",
      message_id: verificationMessageId,
      from: "runtime-core",
      to: this.identitySubsystemId,
      capability_id: "sap.signature.verify",
      intent: "identity.verify_signature",
      payload: {
        subject: message.from,
        signature: message.signature,
        message_id: message.message_id,
        envelope: this.toSignableEnvelope(message)
      }
    };

    const verificationMessage: SAPMessage = {
      ...unsignedEnvelope,
      signature: this.signMessage("runtime-core", unsignedEnvelope)
    };

    const verificationResult = await this.dispatchInternal(verificationMessage, {
      skipIdentityVerification: true,
      skipReplayProtection: true
    });

    const verdict = verificationResult.result as {
      valid?: boolean;
      reason?: string;
    };

    if (!verdict || verdict.valid !== true) {
      throw new Error(
        `SAP signature verification failed for '${message.from}': ${verdict?.reason ?? "unknown reason"}.`
      );
    }
  }

  private enforceRequiredFields(message: SAPMessage): void {
    const requiredStringFields: Array<keyof SAPMessage> = [
      "sap_version",
      "message_id",
      "from",
      "to",
      "capability_id",
      "intent",
      "signature"
    ];

    for (const field of requiredStringFields) {
      const value = message[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`SAP field '${field}' is required.`);
      }
    }
  }

  private enforceSAPVersion(version: SAPVersion): void {
    if (!SUPPORTED_SAP_VERSIONS.has(version)) {
      throw new Error(`Unsupported SAP version '${version}'.`);
    }
  }

  private enforceReplayProtection(messageId: string): void {
    if (this.processedMessageIds.has(messageId)) {
      throw new Error(`SAP replay blocked: message_id '${messageId}' already processed.`);
    }
    this.processedMessageIds.add(messageId);
  }

  private enforceSignature(message: SAPMessage): void {
    const decision = this.signatureScheme.verify(message.from, this.toSignableEnvelope(message), message.signature);
    if (!decision.valid) {
      throw new Error(`SAP signature enforcement failed: ${decision.reason ?? "signature invalid"}`);
    }
  }

  private getSubsystem(subsystemId: string): RuntimeSubsystem {
    const subsystem = this.subsystems.get(subsystemId);
    if (!subsystem) {
      throw new Error(`Subsystem '${subsystemId}' is not registered in DeepFlex Runtime Core.`);
    }
    return subsystem;
  }

  private enforceSenderCapability(grants: string[], requestedCapability: string): void {
    const granted = grants.some((grant) => this.matchesCapability(grant, requestedCapability));
    if (!granted) {
      throw new Error(
        `Capability '${requestedCapability}' is not granted by sender. Sender capabilities: ${grants.join(", ")}`
      );
    }
  }

  private matchesCapability(grant: string, requestedCapability: string): boolean {
    const normalizedGrant = (grant || "").trim();
    if (!normalizedGrant) {
      return false;
    }

    if (normalizedGrant === "*" || normalizedGrant === requestedCapability) {
      return true;
    }

    if (normalizedGrant.endsWith(".*")) {
      const prefix = normalizedGrant.slice(0, -2);
      return requestedCapability.startsWith(`${prefix}.`);
    }

    if (normalizedGrant.startsWith("capsule:")) {
      const capsuleName = normalizedGrant.slice("capsule:".length);
      return requestedCapability.startsWith(`${capsuleName}.`);
    }

    return false;
  }

  private toSignableEnvelope(message: Omit<SAPMessage, "signature"> | SAPMessage): SignableSAPEnvelope {
    return {
      sap_version: message.sap_version,
      message_id: message.message_id,
      from: message.from,
      to: message.to,
      capability_id: message.capability_id,
      intent: message.intent,
      payload: message.payload,
      financial_intent: message.financial_intent
    };
  }

  private mapSettlementDecision(input: SettlementEvaluation): FinancialIntentDecision {
    return {
      allow: input.allow,
      reason: input.reason,
      estimated_cost: input.estimated_cost,
      max_spend: input.max_spend,
      reservation_id: input.reservation_id,
      settlement_model: input.settlement_model,
      currency: input.currency,
      status: input.status
    };
  }
}

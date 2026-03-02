import { AgentRuntime } from "./agent-runtime";
import { AgentWallet, payoutAgent } from "./agent-wallet";
import { evaluateAgentPolicy } from "./agent-policy";
import type { AgentIdentity } from "./agent.types";

import { CapsuleStore } from "../capsule-store";
import { loadCapsuleArtifacts } from "../runtime-loader";
import {
  CapsuleSandbox,
  DeepFlexRuntimeCore,
  createIdentitySubsystem,
  type FinancialIntent,
  type RuntimeSubsystem,
  type SAPMessage
} from "../../deepflex";

const capsuleStore = new CapsuleStore();

interface CapsuleExecutionPayload {
  capsuleName: string;
  route: string;
  payload: unknown;
}

interface PayoutPayload {
  agentId: string;
  amount: number;
  currency: string;
}

// ---------------------------------------------------------
// Agent Orchestrator
// ---------------------------------------------------------

export class AgentOrchestrator {
  private wallet: AgentWallet;
  private readonly runtimeCore: DeepFlexRuntimeCore;
  private readonly capsuleSandbox: CapsuleSandbox;

  constructor(private readonly runtime: AgentRuntime, runtimeCore?: DeepFlexRuntimeCore) {
    this.wallet = new AgentWallet(runtime);
    this.capsuleSandbox = new CapsuleSandbox({
      maxPayloadBytes: 512_000,
      executionTimeoutMs: 25_000
    });
    this.runtimeCore = runtimeCore ?? this.createRuntimeCore();
  }

  // Load agent identity from registry
  loadAgent(agentId: string): AgentIdentity {
    const agent = this.runtime.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  // Build execution context for capsule calls
  buildExecutionContext(agent: AgentIdentity) {
    const walletSummary = this.wallet.bindSummary(agent);

    return {
      agent,
      wallet: walletSummary,
      capabilities: agent.capabilities,
      callCapsule: async (capsuleName: string, route: string, payload: any) => {
        return await this.executeCapsule(agent, capsuleName, route, payload);
      },
      payout: async (amount: number, currency: string) => {
        return await this.executePayout(agent, amount, currency);
      }
    };
  }

  // Execute capsule route with policy enforcement
  async executeCapsule(
    agent: AgentIdentity,
    capsuleName: string,
    route: string,
    payload: any
  ) {
    // Policy check
    const allowed = evaluateAgentPolicy(agent, capsuleName, route);
    if (!allowed) {
      throw new Error(
        `Policy violation: Agent ${agent.id} is not allowed to call ${capsuleName}.${route}`
      );
    }

    const routeId = `${capsuleName}.${route}`;
    const message = this.buildSAPMessage(agent, "capsule-runtime", routeId, "execute_capsule", {
      capsuleName,
      route,
      payload
    });

    const dispatch = await this.runtimeCore.dispatch(message);
    return dispatch.result;
  }

  // List all capsules available to the agent
  listAvailableCapsules(agent: AgentIdentity) {
    const all = capsuleStore.list();
    return all.filter((c) => evaluateAgentPolicy(agent, c.name, "__list__"));
  }

  private async executePayout(agent: AgentIdentity, amount: number, currency: string) {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error("Payout amount must be a positive number.");
    }

    const normalizedCurrency = String(currency || "USD").trim().toUpperCase() || "USD";

    const canPayout = evaluateAgentPolicy(agent, "economic", "triggerPayout");
    if (!canPayout) {
      throw new Error(`Policy violation: Agent ${agent.id} cannot trigger economic.triggerPayout`);
    }

    const financialIntent: FinancialIntent = {
      budget: normalizedAmount,
      currency: normalizedCurrency,
      max_spend: normalizedAmount,
      sponsor: agent.id,
      settlement_model: "wallet-bridge",
      estimated_cost: normalizedAmount
    };

    const message = this.buildSAPMessage<PayoutPayload>(
      agent,
      "financial-intent",
      "economic.triggerPayout",
      "financial_intent.execute_payout",
      {
        agentId: agent.id,
        amount: normalizedAmount,
        currency: normalizedCurrency
      },
      financialIntent
    );

    const dispatch = await this.runtimeCore.dispatch(message);
    return dispatch.result;
  }

  private buildSAPMessage<TPayload>(
    agent: AgentIdentity,
    to: string,
    capabilityId: string,
    intent: string,
    payload: TPayload,
    financialIntent?: FinancialIntent
  ): SAPMessage<TPayload> {
    this.ensureAgentRegistered(agent);

    const messageId = this.runtimeCore.createMessageId("sap");
    const unsignedEnvelope: Omit<SAPMessage<TPayload>, "signature"> = {
      sap_version: "1.0",
      message_id: messageId,
      from: agent.id,
      to,
      capability_id: capabilityId,
      intent,
      payload,
      financial_intent: financialIntent
    };

    return {
      ...unsignedEnvelope,
      signature: this.runtimeCore.signMessage(agent.id, unsignedEnvelope)
    };
  }

  private ensureAgentRegistered(agent: AgentIdentity): void {
    if (this.runtimeCore.hasSubsystem(agent.id)) {
      return;
    }

    const capabilityGrants = new Set<string>([...agent.capabilities]);
    for (const capsuleName of agent.permissions?.capsules ?? []) {
      capabilityGrants.add(`capsule:${capsuleName}`);
    }
    for (const routeId of agent.permissions?.routes ?? []) {
      capabilityGrants.add(routeId);
    }

    this.runtimeCore.registerSubsystem({
      identity: {
        subsystemId: agent.id,
        did: agent.did,
        capabilities: [...capabilityGrants],
        metadata: {
          role: agent.role,
          walletId: agent.walletId
        }
      },
      accepts: [],
      handle: async () => {
        throw new Error(`Agent subsystem '${agent.id}' cannot receive direct SAP calls.`);
      }
    });
  }

  private createRuntimeCore(): DeepFlexRuntimeCore {
    const runtimeCore = new DeepFlexRuntimeCore();

    runtimeCore.registerSubsystem(
      createIdentitySubsystem({
        verifySignature: ({ subject, signature, envelope }) => {
          if (!isSignableEnvelope(envelope)) {
            return {
              valid: false,
              reason: "Identity verification payload is missing SAP envelope details."
            };
          }

          return runtimeCore.verifyMessageSignature(subject, envelope, signature);
        },
        resolveIdentity: (subsystemId) => {
          if (subsystemId === "runtime-core") {
            return {
              subsystemId: "runtime-core",
              did: "did:deepflex:runtime-core",
              status: "active"
            };
          }

          try {
            const agent = this.runtime.getAgent(subsystemId);
            return {
              subsystemId: agent.id,
              did: agent.did,
              status: agent.status === "active" ? "active" : "disabled"
            };
          } catch (_error) {
            return null;
          }
        }
      })
    );

    runtimeCore.registerSubsystem(this.createCapsuleRuntimeSubsystem());
    runtimeCore.registerSubsystem(this.createFinancialIntentSubsystem());

    return runtimeCore;
  }

  private createCapsuleRuntimeSubsystem(): RuntimeSubsystem {
    return {
      identity: {
        subsystemId: "capsule-runtime",
        did: "did:deepflex:capsule-runtime",
        capabilities: ["capsule.execute"]
      },
      accepts: ["execute_capsule"],
      handle: async (message) => {
        const payload = (message.payload ?? {}) as CapsuleExecutionPayload;
        const capsuleName = String(payload.capsuleName || "").trim();
        const route = String(payload.route || "").trim();

        if (!capsuleName || !route) {
          throw new Error("capsule-runtime requires payload.capsuleName and payload.route.");
        }

        const capsule = capsuleStore.get(capsuleName);
        const artifacts = await loadCapsuleArtifacts(capsule.path);
        const handler = artifacts.routes?.[route];

        if (typeof handler !== "function") {
          throw new Error(`Route not found: ${capsuleName}.${route} in ${capsule.path}`);
        }

        const sandboxed = await this.capsuleSandbox.execute({
          capsuleName,
          route,
          payload: payload.payload,
          handler
        });

        return sandboxed.result;
      }
    };
  }

  private createFinancialIntentSubsystem(): RuntimeSubsystem {
    return {
      identity: {
        subsystemId: "financial-intent",
        did: "did:deepflex:financial-intent",
        capabilities: ["financial.intent.evaluate", "economic.triggerPayout"]
      },
      accepts: ["financial_intent.evaluate", "financial_intent.execute_payout", "negotiate"],
      handle: async (message) => {
        if (message.intent === "financial_intent.evaluate" || message.intent === "negotiate") {
          return {
            ok: true,
            subsystem: "financial-intent",
            mode: "stub",
            note: "FinancialIntent stub evaluation completed by runtime core."
          };
        }

        if (message.intent !== "financial_intent.execute_payout") {
          throw new Error(`financial-intent does not handle '${message.intent}'.`);
        }

        const payload = (message.payload ?? {}) as PayoutPayload;
        const agentId = String(payload.agentId || "").trim();
        const amount = Number(payload.amount);
        const currency = String(payload.currency || "USD").trim().toUpperCase() || "USD";

        if (!agentId) {
          throw new Error("financial-intent.execute_payout requires payload.agentId.");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("financial-intent.execute_payout requires a positive payload.amount.");
        }

        const settlementStub = this.runtimeCore.getSettlementStub();
        const reservation = settlementStub.getReservation(message.message_id);
        const settlement = reservation ? settlementStub.settle(message.message_id) : null;

        const payout = await payoutAgent(agentId, amount, currency);
        return {
          payout,
          settlement
        };
      }
    };
  }
}

function isSignableEnvelope(value: unknown): value is Omit<SAPMessage, "signature"> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SAPMessage>;
  const required = [
    candidate.sap_version,
    candidate.message_id,
    candidate.from,
    candidate.to,
    candidate.capability_id,
    candidate.intent
  ];

  return required.every((field) => typeof field === "string" && field.trim().length > 0);
}

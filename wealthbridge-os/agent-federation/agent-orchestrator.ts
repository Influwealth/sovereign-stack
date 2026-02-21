import { AgentRuntime } from "./agent-runtime";
import { AgentWallet, payoutAgent } from "./agent-wallet";
import { evaluateAgentPolicy } from "./agent-policy";
import type { AgentIdentity } from "./agent.types";

import { CapsuleStore } from "../capsule-store";
import { loadCapsuleArtifacts } from "../runtime-loader";

const capsuleStore = new CapsuleStore();

// ---------------------------------------------------------
// Agent Orchestrator
// ---------------------------------------------------------

export class AgentOrchestrator {
  private wallet: AgentWallet;

  constructor(private readonly runtime: AgentRuntime) {
    this.wallet = new AgentWallet(runtime);
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
        return await payoutAgent(agent.id, amount, currency);
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

    // Load capsule metadata + routes via CapsuleStore instance
    const capsule = capsuleStore.get(capsuleName);
    if (!capsule) {
      throw new Error(`Capsule not found: ${capsuleName}`);
    }

    const artifacts = await loadCapsuleArtifacts(capsule.path);
    const handler = artifacts.routes?.[route];

    if (!handler) {
      throw new Error(
        `Route not found: ${capsuleName}.${route} in ${capsule.path}`
      );
    }

    // Execute route
    return await handler(payload);
  }

  // List all capsules available to the agent
  listAvailableCapsules(agent: AgentIdentity) {
    const all = capsuleStore.list();
    return all.filter((c) => evaluateAgentPolicy(agent, c.name, "__list__"));
  }
}


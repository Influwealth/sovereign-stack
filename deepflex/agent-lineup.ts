import type { MeshHealthProbeResult, MeshNodeStatus } from "./mesh-registration";
import type { DeepFlexRuntimeCore } from "./runtime-core";

export interface AgentLineupDefinition {
  id: string;
  description: string;
  capabilities: string[];
  capsules: string[];
  healthCheckPath: string;
  execPath: string;
  version: string;
  enabled: boolean;
  supervisor?: boolean;
  routingHints: string[];
}

export interface CapsuleAgentAssignment {
  capsule: string;
  primaryAgent: string;
  fallbackAgents: string[];
  todo: string;
}

export const AGENT_LINEUP: AgentLineupDefinition[] = [
  {
    id: "claude-code",
    description: "Code generation and architectural drafting agent for compute-heavy workflows.",
    capabilities: [
      "capsule:compute",
      "capsule:observability",
      "capsule:messaging",
      "compute.codegen",
      "compute.debug",
      "observability.analyze",
      "messaging.draft"
    ],
    capsules: ["compute", "observability", "messaging"],
    healthCheckPath: "deepflex://agents/claude-code/health",
    execPath: "claude",
    version: "0.1.0",
    enabled: true,
    routingHints: ["code", "architecture", "refactor", "debug"]
  },
  {
    id: "gemini-cli",
    description: "Research and synthesis agent for identity, compliance, and policy-heavy tasks.",
    capabilities: [
      "capsule:identity",
      "capsule:compliance",
      "capsule:messaging",
      "identity.research",
      "compliance.evaluate",
      "messaging.compose"
    ],
    capsules: ["identity", "compliance", "messaging"],
    healthCheckPath: "deepflex://agents/gemini-cli/health",
    execPath: "gemini",
    version: "0.1.0",
    enabled: true,
    routingHints: ["research", "policy", "analysis", "compliance"]
  },
  {
    id: "codex",
    description: "Primary implementation agent for compute, ops, and funding workflows.",
    capabilities: [
      "capsule:compute",
      "capsule:business-ops",
      "capsule:funding-intelligence",
      "compute.implement",
      "compute.review",
      "business-ops.workflow.start",
      "funding-intelligence.model.evaluate"
    ],
    capsules: ["compute", "business-ops", "funding-intelligence"],
    healthCheckPath: "deepflex://agents/codex/health",
    execPath: "codex",
    version: "0.1.0",
    enabled: true,
    routingHints: ["implement", "patch", "review", "ops"]
  },
  {
    id: "deepflex-uhura",
    description: "Supervisor agent for escalation, coordination, and mesh-wide agent oversight.",
    capabilities: ["*", "agent.supervisor", "mesh.supervise", "mesh.route.recover"],
    capsules: [
      "business-ops",
      "compliance",
      "compute",
      "economic",
      "funding-intelligence",
      "identity",
      "messaging",
      "observability",
      "social",
      "sovereign-financial-ops",
      "wealthbridge-tax-stack"
    ],
    healthCheckPath: "deepflex://agents/deepflex-uhura/health",
    execPath: "deepflex-uhura",
    version: "0.1.0",
    enabled: true,
    supervisor: true,
    routingHints: ["supervise", "fallback", "escalate", "coordinate"]
  },
  {
    id: "turbo-quant",
    description: "Optimization and quantitative planning agent for economic and financial execution.",
    capabilities: [
      "capsule:economic",
      "capsule:compute",
      "capsule:funding-intelligence",
      "capsule:sovereign-financial-ops",
      "economic.optimize",
      "compute.quantize",
      "funding-intelligence.score",
      "sovereign-financial-ops.forecast"
    ],
    capsules: ["economic", "compute", "funding-intelligence", "sovereign-financial-ops"],
    healthCheckPath: "deepflex://agents/turbo-quant/health",
    execPath: "turbo-quant",
    version: "0.1.0",
    enabled: true,
    routingHints: ["forecast", "quant", "optimize", "score"]
  },
  {
    id: "godmode-browser",
    description: "Browser automation and external workflow agent for monitoring and interaction tasks.",
    capabilities: [
      "capsule:observability",
      "capsule:social",
      "capsule:messaging",
      "social.browser.automate",
      "messaging.browser.dispatch",
      "observability.scrape"
    ],
    capsules: ["observability", "social", "messaging"],
    healthCheckPath: "deepflex://agents/godmode-browser/health",
    execPath: "godmode-browser",
    version: "0.1.0",
    enabled: true,
    routingHints: ["browser", "scrape", "monitor", "automation"]
  },
  {
    id: "ad-autonomous",
    description: "Campaign execution agent for social, messaging, ops, and budget adjustments.",
    capabilities: [
      "capsule:business-ops",
      "capsule:social",
      "capsule:messaging",
      "capsule:economic",
      "business-ops.campaign.launch",
      "social.campaign.optimize",
      "messaging.outreach.sequence",
      "economic.budget.rebalance"
    ],
    capsules: ["business-ops", "social", "messaging", "economic"],
    healthCheckPath: "deepflex://agents/ad-autonomous/health",
    execPath: "ad-autonomous",
    version: "0.1.0",
    enabled: true,
    routingHints: ["campaign", "outreach", "ads", "growth"]
  }
];

export const CAPSULE_AGENT_ASSIGNMENTS: CapsuleAgentAssignment[] = [
  {
    capsule: "business-ops",
    primaryAgent: "codex",
    fallbackAgents: ["ad-autonomous", "deepflex-uhura"],
    todo: "TODO: refine workflow ownership between Codex and ad-autonomous."
  },
  {
    capsule: "compliance",
    primaryAgent: "gemini-cli",
    fallbackAgents: ["deepflex-uhura", "claude-code"],
    todo: "TODO: map policy and audit workflows to compliance-specific handlers."
  },
  {
    capsule: "compute",
    primaryAgent: "codex",
    fallbackAgents: ["claude-code", "turbo-quant", "deepflex-uhura"],
    todo: "TODO: split implementation, debugging, and optimization routes."
  },
  {
    capsule: "economic",
    primaryAgent: "turbo-quant",
    fallbackAgents: ["ad-autonomous", "deepflex-uhura"],
    todo: "TODO: differentiate financial planning from budget actuation."
  },
  {
    capsule: "funding-intelligence",
    primaryAgent: "turbo-quant",
    fallbackAgents: ["codex", "deepflex-uhura"],
    todo: "TODO: route scoring versus execution support to separate agents."
  },
  {
    capsule: "identity",
    primaryAgent: "gemini-cli",
    fallbackAgents: ["deepflex-uhura", "codex"],
    todo: "TODO: add identity verification and DID workflow specialization."
  },
  {
    capsule: "messaging",
    primaryAgent: "godmode-browser",
    fallbackAgents: ["claude-code", "gemini-cli", "ad-autonomous"],
    todo: "TODO: separate drafting, dispatch, and browser relay flows."
  },
  {
    capsule: "observability",
    primaryAgent: "godmode-browser",
    fallbackAgents: ["claude-code", "deepflex-uhura"],
    todo: "TODO: map dashboards, scraping, and anomaly analysis independently."
  },
  {
    capsule: "social",
    primaryAgent: "ad-autonomous",
    fallbackAgents: ["godmode-browser", "deepflex-uhura"],
    todo: "TODO: add campaign planning versus engagement routing logic."
  },
  {
    capsule: "sovereign-financial-ops",
    primaryAgent: "turbo-quant",
    fallbackAgents: ["deepflex-uhura", "codex"],
    todo: "TODO: wire financial forecasting and filing support to external rails."
  },
  {
    capsule: "wealthbridge-tax-stack",
    primaryAgent: "deepflex-uhura",
    fallbackAgents: ["turbo-quant", "gemini-cli"],
    todo: "TODO: bridge tax capsule Python execution into the agent federation."
  }
];

export function getAgentLineupDefinition(agentId: string): AgentLineupDefinition | undefined {
  return AGENT_LINEUP.find((entry) => entry.id === agentId);
}

export function getCapsuleAgentAssignment(capsuleName: string): CapsuleAgentAssignment | undefined {
  return CAPSULE_AGENT_ASSIGNMENTS.find((entry) => entry.capsule === capsuleName);
}

export function getCapsuleAgentAssignments(capsuleName: string): string[] {
  const assignment = getCapsuleAgentAssignment(capsuleName);
  if (!assignment) {
    return ["deepflex-uhura"];
  }

  return [assignment.primaryAgent, ...assignment.fallbackAgents];
}

export function createAgentMeshHealth(agentId: string): MeshHealthProbeResult {
  const definition = getAgentLineupDefinition(agentId);
  if (!definition) {
    return {
      subsystemId: `agent:${agentId}`,
      status: "degraded",
      detail: "Agent is not part of the configured lineup.",
      ts: new Date().toISOString()
    };
  }

  const status: MeshNodeStatus = definition.enabled ? "healthy" : "offline";
  return {
    subsystemId: `agent:${definition.id}`,
    status,
    detail: definition.enabled
      ? `Configured placeholder health check at ${definition.healthCheckPath}.`
      : "Agent is disabled in the lineup definition.",
    ts: new Date().toISOString()
  };
}

export function installAgentMesh(runtime: DeepFlexRuntimeCore, lineup: AgentLineupDefinition[] = AGENT_LINEUP): void {
  for (const agent of lineup) {
    runtime.registerExternalNode({
      subsystemId: `agent:${agent.id}`,
      did: `did:wb:agent:${agent.id}`,
      endpoint: agent.healthCheckPath,
      zone: "agent-federation",
      version: agent.version,
      status: agent.enabled ? "registered" : "offline"
    });

    runtime.logRuntimeEvent("agent.mesh.registered", {
      agentId: agent.id,
      execPath: agent.execPath,
      supervisor: agent.supervisor === true
    });
  }
}

export async function runAgentHealthSweep(
  runtime: DeepFlexRuntimeCore,
  lineup: AgentLineupDefinition[] = AGENT_LINEUP
): Promise<MeshHealthProbeResult[]> {
  const statuses: MeshHealthProbeResult[] = [];

  for (const agent of lineup) {
    const result = createAgentMeshHealth(agent.id);
    runtime.updateExternalNodeHealth(result.subsystemId, result.status, result.detail);
    runtime.logRuntimeEvent("agent.health.checked", {
      agentId: agent.id,
      status: result.status,
      detail: result.detail
    });

    if (agent.supervisor) {
      await runtime.notifySupervisor(agent.id, "agent.health.checked", {
        status: result.status,
        detail: result.detail
      });
    }

    statuses.push(result);
  }

  return statuses;
}

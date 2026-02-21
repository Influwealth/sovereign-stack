import type { CapsuleName } from "./runtime-loader";

export interface PolicyInput {
  capsule: CapsuleName;
  routeId: string;
  actor: string;
  capabilities: string[];
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
}

const ROUTE_POLICY: Record<CapsuleName, string[]> = {
  identity: ["identity.execute", "os.orchestrate"],
  messaging: ["messaging.execute", "os.orchestrate"],
  compute: ["compute.execute", "os.orchestrate"],
  economic: ["economic.execute", "os.orchestrate"],
  social: ["social.execute", "os.orchestrate"]
};

export class PolicyEngine {
  evaluate(input: PolicyInput): PolicyDecision {
    const { capsule, routeId, actor, capabilities } = input;

    if (!routeId.startsWith(`${capsule}.`)) {
      return {
        allow: false,
        reason: `Route '${routeId}' is outside capsule namespace '${capsule}'.`
      };
    }

    if (actor === "system") {
      return { allow: true, reason: "System actor bypass granted." };
    }

    const allowedCaps = ROUTE_POLICY[capsule] ?? [];
    const granted = capabilities.some((capability) => allowedCaps.includes(capability));

    if (!granted) {
      return {
        allow: false,
        reason: `Actor '${actor}' lacks required capability for capsule '${capsule}'.`
      };
    }

    return { allow: true, reason: "Capability policy check passed." };
  }
}

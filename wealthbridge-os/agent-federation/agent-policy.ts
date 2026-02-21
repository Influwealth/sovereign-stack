import type { AgentIdentity } from "./agent.types";

/**
 * evaluateAgentPolicy
 * -------------------
 * Determines whether an agent is allowed to call a given capsule + route.
 * This is the enforcement layer for:
 *   - capability profiles
 *   - permissions envelopes
 *   - restricted capsule namespaces
 *   - route-level access control
 */

export function evaluateAgentPolicy(
  agent: AgentIdentity,
  capsuleName: string,
  route: string
): boolean {
  // 1. Super-admin override
  if (agent.role === "superadmin") {
    return true;
  }

  // 2. Capability-based access
  const capabilityKey = `${capsuleName}.${route}`;
  if (agent.capabilities?.includes(capabilityKey)) {
    return true;
  }

  // 3. Capsule-level access (agent can access entire capsule)
  if (agent.capabilities?.includes(`capsule:${capsuleName}`)) {
    return true;
  }

  // 4. Route-level permissions envelope
  if (agent.permissions?.routes?.includes(capabilityKey)) {
    return true;
  }

  // 5. Capsule-level permissions envelope
  if (agent.permissions?.capsules?.includes(capsuleName)) {
    return true;
  }

  // 6. Special case: listing capsules
  if (route === "__list__") {
    return true;
  }

  // 7. Default deny
  return false;
}

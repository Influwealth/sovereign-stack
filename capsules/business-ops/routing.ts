import { getCapsuleAgentAssignment, getCapsuleAgentAssignments } from "../../deepflex";

const capsuleName = "business-ops";
const assignment = getCapsuleAgentAssignment(capsuleName);

export const capsuleAgentRegistration = {
  capsule: capsuleName,
  agents: getCapsuleAgentAssignments(capsuleName),
  primaryAgent: assignment?.primaryAgent ?? "deepflex-uhura",
  fallbackAgents: assignment?.fallbackAgents ?? ["deepflex-uhura"],
  todo: "TODO: map business-ops workflow intents to agent-specific executors."
};

export const routing = {
  delegateTask: {
    routeId: "business-ops.delegate.task",
    primaryAgent: capsuleAgentRegistration.primaryAgent,
    fallbackAgents: capsuleAgentRegistration.fallbackAgents,
    todo: capsuleAgentRegistration.todo
  }
};

export function registerCapsuleWithAgentFederation() {
  return capsuleAgentRegistration;
}

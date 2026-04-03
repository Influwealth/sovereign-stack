import { getCapsuleAgentAssignment, getCapsuleAgentAssignments } from "../../deepflex";

const capsuleName = "sovereign-financial-ops";
const assignment = getCapsuleAgentAssignment(capsuleName);

export const capsuleAgentRegistration = {
  capsule: capsuleName,
  agents: getCapsuleAgentAssignments(capsuleName),
  primaryAgent: assignment?.primaryAgent ?? "deepflex-uhura",
  fallbackAgents: assignment?.fallbackAgents ?? ["deepflex-uhura"],
  todo: "TODO: map sovereign financial planning and filing intents to agent-specific executors."
};

export const routing = {
  delegateTask: {
    routeId: "sovereign-financial-ops.delegate.task",
    primaryAgent: capsuleAgentRegistration.primaryAgent,
    fallbackAgents: capsuleAgentRegistration.fallbackAgents,
    todo: capsuleAgentRegistration.todo
  }
};

export function registerCapsuleWithAgentFederation() {
  return capsuleAgentRegistration;
}

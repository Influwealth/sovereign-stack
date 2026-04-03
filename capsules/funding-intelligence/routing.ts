import { getCapsuleAgentAssignment, getCapsuleAgentAssignments } from "../../deepflex";

const capsuleName = "funding-intelligence";
const assignment = getCapsuleAgentAssignment(capsuleName);

export const capsuleAgentRegistration = {
  capsule: capsuleName,
  agents: getCapsuleAgentAssignments(capsuleName),
  primaryAgent: assignment?.primaryAgent ?? "deepflex-uhura",
  fallbackAgents: assignment?.fallbackAgents ?? ["deepflex-uhura"],
  todo: "TODO: map funding analysis and scoring intents to agent-specific executors."
};

export const routing = {
  delegateTask: {
    routeId: "funding-intelligence.delegate.task",
    primaryAgent: capsuleAgentRegistration.primaryAgent,
    fallbackAgents: capsuleAgentRegistration.fallbackAgents,
    todo: capsuleAgentRegistration.todo
  }
};

export function registerCapsuleWithAgentFederation() {
  return capsuleAgentRegistration;
}

import { getCapsuleAgentAssignment, getCapsuleAgentAssignments } from "../../deepflex";

const capsuleName = "compute";
const assignment = getCapsuleAgentAssignment(capsuleName);

export const capsuleAgentRegistration = {
  capsule: capsuleName,
  agents: getCapsuleAgentAssignments(capsuleName),
  primaryAgent: assignment?.primaryAgent ?? "deepflex-uhura",
  fallbackAgents: assignment?.fallbackAgents ?? ["deepflex-uhura"],
  todo: "TODO: map compute build, debug, and optimization intents to agent-specific executors."
};

export const routing = {
  delegateTask: {
    routeId: "compute.delegate.task",
    primaryAgent: capsuleAgentRegistration.primaryAgent,
    fallbackAgents: capsuleAgentRegistration.fallbackAgents,
    todo: capsuleAgentRegistration.todo
  }
};

export function registerCapsuleWithAgentFederation() {
  return capsuleAgentRegistration;
}

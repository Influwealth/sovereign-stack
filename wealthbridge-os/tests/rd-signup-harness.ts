import { AgentRuntime } from "../agent-federation/agent-runtime";
import { AgentOrchestrator } from "../agent-federation/agent-orchestrator";
import type { RDSignupInput } from "../capsules/rd-signup-types";

async function main() {
  const runtime = new AgentRuntime();
  const orchestrator = new AgentOrchestrator(runtime);

  const agent = orchestrator.loadAgent("agent_001");
  const payload: RDSignupInput = {
    name: "Avery Rivera",
    email: "avery.rivera@example.com",
    businessType: "AI SaaS",
    country: "US",
    state: "NY",
    hasChatHistory: true,
    hasPrototypes: true,
    employmentStatus: "founder",
    incomeBand: "250k-500k",
    chatHistorySummary:
      "Discussed architecture iterations, prompt optimization, and prototype telemetry analysis across multiple assistant sessions."
  };

  const result = await orchestrator.executeRDSignupIntent(agent, payload);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[RD-SIGNUP-HARNESS] Failure:", error);
  process.exit(1);
});

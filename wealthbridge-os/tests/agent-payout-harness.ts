import { AgentRuntime } from "../agent-federation/agent-runtime";
import { AgentOrchestrator } from "../agent-federation/agent-orchestrator";

async function main() {
  const runtime = new AgentRuntime();
  const orchestrator = new AgentOrchestrator(runtime);

  const agentId = "agent_001";
  const agent = orchestrator.loadAgent(agentId);
  const ctx = orchestrator.buildExecutionContext(agent);

  console.log("[TEST] Agent execution context:");
  console.log(JSON.stringify(ctx.wallet, null, 2));

  console.log("[TEST] Triggering payout of 10 USDC...");
  const result = await ctx.payout(10, "USD");

  console.log("[TEST] Payout result:");
  console.dir(result, { depth: null });
}

main().catch((err) => {
  console.error("[TEST] Error in agent payout harness:", err);
  process.exit(1);
});

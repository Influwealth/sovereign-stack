import { AgentRuntime } from "../../wealthbridge-os/agent-federation/agent-runtime";

const runtime = new AgentRuntime();

export const routes = {
  listAgents: async () => {
    return runtime.listAgents();
  },
  listWallets: async () => {
    return runtime.listWalletBindings();
  }
};

import * as fs from "node:fs";
import * as path from "node:path";
import type {

  AgentIdentity,
  AgentRegistry,
  CapabilityProfile,
  WalletBinding
} from "./agent.types";
import { fileURLToPath } from "node:url";
import { dirname as _dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

export class AgentRuntime {
  private readonly registryPath: string;
  private cache?: AgentRegistry;

  constructor(registryPath = path.resolve(__dirname, "agent-registry.json")) {
    this.registryPath = registryPath;
  }

  loadRegistry(): AgentRegistry {
    const raw = fs.readFileSync(this.registryPath, "utf8");
    const parsed = JSON.parse(raw) as AgentRegistry;
    this.validate(parsed);
    this.cache = parsed;
    return parsed;
  }

  getRegistry(): AgentRegistry {
    return this.cache ?? this.loadRegistry();
  }

  getAgent(agentId: string): AgentIdentity {
    const agent = this.getRegistry().agents.find((entry) => entry.id === agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found.`);
    }
    if (agent.status !== "active") {
      throw new Error(`Agent '${agentId}' is not active.`);
    }
    return agent;
  }

  getCapabilityProfile(profileName: string): CapabilityProfile {
    const profile = this.getRegistry().capabilityProfiles.find((entry) => entry.name === profileName);
    if (!profile) {
      throw new Error(`Capability profile '${profileName}' not found.`);
    }
    return profile;
  }

  getWalletBinding(walletId: string): WalletBinding {
    const wallet = this.getRegistry().walletBindings.find((entry) => entry.walletId === walletId);
    if (!wallet) {
      throw new Error(`Wallet binding '${walletId}' not found.`);
    }
    return wallet;
  }

  private validate(registry: AgentRegistry): void {
    if (!Array.isArray(registry.agents)) {
      throw new Error("agent-registry.json invalid: 'agents' must be an array.");
    }
    if (!Array.isArray(registry.capabilityProfiles)) {
      throw new Error("agent-registry.json invalid: 'capabilityProfiles' must be an array.");
    }
    if (!Array.isArray(registry.walletBindings)) {
      throw new Error("agent-registry.json invalid: 'walletBindings' must be an array.");
    }
  }
}

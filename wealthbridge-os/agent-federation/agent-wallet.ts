import { AgentRuntime } from "./agent-runtime";
import type { AgentIdentity, WalletBinding } from "./agent.types";

// ---------------------------------------------------------
// Agent Wallet Resolver + Summary Binder
// ---------------------------------------------------------

export class AgentWallet {
  constructor(private readonly runtime: AgentRuntime) {}

  resolveWallet(agent: AgentIdentity): WalletBinding {
    return this.runtime.getWalletBinding(agent.walletId);
  }

  bindSummary(agent: AgentIdentity): {
    agentId: string;
    did: string;
    walletId: string;
    network: string;
    address: string;
  } {
    const wallet = this.resolveWallet(agent);

    return {
      agentId: agent.id,
      did: agent.did,
      walletId: wallet.walletId,
      network: wallet.network,
      address: wallet.address
    };
  }
}

// ---------------------------------------------------------
// Sovereign Wallet Bridge Payout Hook
// ---------------------------------------------------------

import { triggerPayout } from "../src/wallet-bridge";

/**
 * payoutAgent
 * -----------
 * Unified payout entrypoint for the entire OS.
 * Called by:
 *   - Economic Capsule
 *   - Funding Intelligence Capsule
 *   - Agent Orchestrator
 *   - External commerce rails (Shopify/Wix)
 */
export async function payoutAgent(
  agentId: string,
  amount: number,
  currency: string
) {
  return await triggerPayout(agentId, amount, currency);
}

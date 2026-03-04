/**
 * AgentIdentity
 * -------------
 * Core identity object for every agent in the system.
 * Includes:
 *   - DID
 *   - capability profile
 *   - permissions envelope
 *   - wallet binding reference
 */

export interface AgentIdentity {
  id: string;                     // internal agent ID
  did: string;                    // decentralized identifier
  role: "standard" | "admin" | "superadmin";
  walletId: string;               // links to WalletBinding
  capabilities: string[];         // capability profile (capsule.route)
  permissions: {
    capsules: string[];           // capsule-level permissions
    routes: string[];             // route-level permissions
  };
  status: "active" | "disabled" | "pending";
}

/**
 * WalletBinding
 * -------------
 * Maps an agent's walletId to:
 *   - network
 *   - address
 *   - metadata
 * Used by:
 *   - AgentWallet
 *   - AgentOrchestrator
 *   - Sovereign Wallet Bridge
 */

export interface WalletBinding {
  walletId: string;               // unique wallet reference
  network: string;                // e.g. "circle-mainnet", "polygon", "mpesa"
  address: string;                // wallet address or account identifier
  metadata?: Record<string, any>; // optional metadata
}

export interface CapabilityProfile {
  id?: string;
  name?: string;
  label?: string;
  capabilities: string[];
}

export interface AgentRegistry {
  agents: AgentIdentity[];
  capabilityProfiles: CapabilityProfile[];
  walletBindings: WalletBinding[];
}

/**
 * CapsuleExecutionContext
 * -----------------------
 * Passed to capsule route handlers when an agent executes a call.
 * Includes:
 *   - agent identity
 *   - wallet summary
 *   - capabilities
 *   - capsule call function
 *   - payout function
 */

export interface CapsuleExecutionContext {
  agent: AgentIdentity;
  wallet: {
    agentId: string;
    did: string;
    walletId: string;
    network: string;
    address: string;
  };
  capabilities: string[];
  callCapsule: (
    capsuleName: string,
    route: string,
    payload: any
  ) => Promise<any>;
  rdSignup?: (input: Record<string, unknown>) => Promise<any>;
  payout: (amount: number, currency: string) => Promise<any>;
}

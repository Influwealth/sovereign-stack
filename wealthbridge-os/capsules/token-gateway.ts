/**
 * Token Gateway — Three-Tier Token System
 *
 * Tier 1: In-game tokens (East Flatbush / Roblox — EBTK)
 * Tier 2: Greenville Coin (ICP canister, USD-pegged — GVC)
 * Tier 3: WealthBridge Service Tokens (capsule execution units — WBST)
 */

export type TokenTier = 1 | 2 | 3;
export type TokenSymbol = "EBTK" | "GVC" | "WBST";

export interface TokenBalance {
  address: string;
  tier: TokenTier;
  symbol: TokenSymbol;
  balance: number;
  locked: number;
}

export interface TransferRequest {
  from: string;
  to: string;
  amount: number;
  tier: TokenTier;
  memo?: string;
}

export interface TransferResult {
  txId: string;
  status: "pending" | "confirmed" | "failed";
  from: string;
  to: string;
  amount: number;
  tier: TokenTier;
  timestamp: number;
}

export interface BridgeRequest {
  playerId: string;
  amount: number;
  icpAddress: string;
}

const TIER_SYMBOLS: Record<TokenTier, TokenSymbol> = {
  1: "EBTK",
  2: "GVC",
  3: "WBST",
};

// Bridge exchange rates (Tier 1 → Tier 2 only; Tier 2 is USD-pegged)
const BRIDGE_RATE_TIER1_TO_TIER2 = 0.01; // 100 EBTK = 1 GVC = $1 USD

export class TokenGateway {
  private ledger: Map<string, Map<TokenTier, number>> = new Map();

  getBalance(address: string, tier: TokenTier): TokenBalance {
    const balance = this.ledger.get(address)?.get(tier) ?? 0;
    return {
      address,
      tier,
      symbol: TIER_SYMBOLS[tier],
      balance,
      locked: 0,
    };
  }

  getAllBalances(address: string): TokenBalance[] {
    return ([1, 2, 3] as TokenTier[]).map((tier) => this.getBalance(address, tier));
  }

  transfer(req: TransferRequest): TransferResult {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fromBalance = this.ledger.get(req.from)?.get(req.tier) ?? 0;

    if (fromBalance < req.amount) {
      return { txId, status: "failed", from: req.from, to: req.to, amount: req.amount, tier: req.tier, timestamp: Date.now() };
    }

    this._debit(req.from, req.tier, req.amount);
    this._credit(req.to, req.tier, req.amount);

    return { txId, status: "confirmed", from: req.from, to: req.to, amount: req.amount, tier: req.tier, timestamp: Date.now() };
  }

  /**
   * Bridge Tier 1 (EBTK in-game) → Tier 2 (GVC ICP canister).
   * Production: calls the Greenville Coin ICP canister via dfx/agent-js.
   * Scaffold: records the bridge transaction locally and returns a pending tx.
   */
  bridgeTier1ToTier2(req: BridgeRequest): TransferResult {
    const txId = `bridge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const playerBalance = this.ledger.get(req.playerId)?.get(1) ?? 0;

    if (playerBalance < req.amount) {
      return { txId, status: "failed", from: req.playerId, to: req.icpAddress, amount: req.amount, tier: 1, timestamp: Date.now() };
    }

    const gvcAmount = req.amount * BRIDGE_RATE_TIER1_TO_TIER2;
    this._debit(req.playerId, 1, req.amount);
    // In production: call ICP canister greenville_coin.mint(req.icpAddress, gvcAmount)
    this._credit(req.icpAddress, 2, gvcAmount);

    return { txId, status: "pending", from: req.playerId, to: req.icpAddress, amount: gvcAmount, tier: 2, timestamp: Date.now() };
  }

  private _credit(address: string, tier: TokenTier, amount: number): void {
    if (!this.ledger.has(address)) this.ledger.set(address, new Map());
    const current = this.ledger.get(address)!.get(tier) ?? 0;
    this.ledger.get(address)!.set(tier, current + amount);
  }

  private _debit(address: string, tier: TokenTier, amount: number): void {
    if (!this.ledger.has(address)) this.ledger.set(address, new Map());
    const current = this.ledger.get(address)!.get(tier) ?? 0;
    this.ledger.get(address)!.set(tier, Math.max(0, current - amount));
  }
}

export const tokenGateway = new TokenGateway();
